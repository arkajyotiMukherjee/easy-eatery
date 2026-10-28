#!/usr/bin/env python3
"""Rebuild portable Graphify context and validate source freshness without secrets/LLM calls."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'graphify-out'
GRAPH = OUT / 'graph.json'
META = OUT / 'context-meta.json'


def sources():
    paths = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
    result = {}
    for name in sorted(set(paths)):
        p = ROOT / name
        if not name or not p.is_file() or name.startswith(('graphify-out/', '.codex/', '.graphify-venv/')):
            continue
        selected = '/' not in name or name.startswith(('apps/', 'scripts/', 'tests/', 'migrations/', 'docs/', '.github/'))
        if selected and (p.suffix in ('.md', '.ts', '.js', '.css', '.html', '.sql', '.json', '.py', '.yml', '.yaml') or '/' not in name):
            result[name] = hashlib.sha256(p.read_bytes()).hexdigest()
    return result


def overlay(data, paths):
    """Copy explicit Markdown sections/decisions; do not invent inferred runtime facts."""
    if 'links' not in data:
        data['links'] = data.pop('edges', [])
    data.setdefault('directed', False)
    data.setdefault('multigraph', False)
    data.setdefault('graph', {})
    data['nodes'] = [n for n in data['nodes'] if not n['id'].startswith('project-context:') and not n.get('source_file', '').endswith('.md')]
    ids = {n['id'] for n in data['nodes']}
    data['links'] = [e for e in data['links'] if e['source'] in ids and e['target'] in ids]
    def node(key, label, source, line, text):
        ident = 'project-context:' + key
        data['nodes'].append(dict(id=ident, label=label, source_file=source, source_location=f'L{line}', description=text,
                                  file_type='document', _origin='versioned_context', confidence='EXTRACTED', community=-1, community_name='Project context'))
        return ident
    def edge(a, b, source, relation='references'):
        data['links'].append(dict(source=a, target=b, relation=relation, confidence='EXTRACTED', confidence_score=1.0,
                                  _origin='versioned_context', source_file=source, weight=1))
    code = [n for n in data['nodes'] if n.get('file_type') == 'code']
    for name in paths:
        if not name.endswith('.md') or not (name.endswith('AGENTS.md') or name in ('README.md',) or name.startswith('docs/')):
            continue
        lines = (ROOT / name).read_text().splitlines()
        starts = [i for i, line in enumerate(lines) if re.match(r'^#{1,3} ', line)] or [0]
        parent = node(name, name, name, 1, '\n'.join(lines[:starts[1] if len(starts)>1 else len(lines)]))
        for index, start in enumerate(starts):
            end = starts[index+1] if index+1 < len(starts) else len(lines)
            text = '\n'.join(lines[start:end])
            title = lines[start].lstrip('# ').strip() if lines else name
            ident = node(f'{name}:{start+1}', f'{name}: {title}', name, start+1, text)
            edge(parent, ident, name, 'contains')
            for n in code:
                path = n.get('source_file', '')
                label = n.get('label', '')
                if path and (path in text or (len(label)>6 and f'`{label}`' in text)):
                    edge(ident, n['id'], name)
    decisions = json.loads((ROOT / 'docs/context-decisions.json').read_text())
    for item in decisions['decisions']:
        ident = node('decision:' + item['id'], item['title'], item['source'], 1, item['detail'])
        parent = 'project-context:' + item['source']
        if any(n['id'] == parent for n in data['nodes']):
            edge(ident, parent, item['source'], 'documented_in')
        for n in code:
            if n.get('source_file') in item.get('code_paths', []):
                edge(ident, n['id'], item['source'], 'governs')
    data.setdefault('graph', {})['context_overlay'] = 'Explicit versioned Markdown and decisions, not a chat transcript or vendor acceptance evidence'
    return data


def check():
    meta = json.loads(META.read_text())
    current = sources()
    changed = sorted(k for k in set(current) | set(meta['source_hashes']) if current.get(k) != meta['source_hashes'].get(k))
    if changed:
        raise SystemExit('Context stale; run python3 scripts/update-context.py. Changed sources: ' + ', '.join(changed))
    for name, expected in meta['artifact_hashes'].items():
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != expected:
            raise SystemExit(f'Context artifact changed without refresh: {name}')
    data = json.loads(GRAPH.read_text())
    ids = {n['id'] for n in data['nodes']}
    assert len(ids) == len(data['nodes']), 'Duplicate graph node IDs'
    assert all(e['source'] in ids and e['target'] in ids for e in data['links']), 'Dangling graph link'
    assert all(not Path(n.get('source_file', '')).is_absolute() for n in data['nodes']), 'Graph source paths must be portable'
    assert any(n['id'] == 'project-context:decision:verification' for n in data['nodes']), 'Missing blocker context'
    print(f'Context current: {len(current)} sources, {len(ids)} graph nodes; source and artifact hashes match.')


def refresh():
    executable = ROOT / '.graphify-venv/bin/graphify'
    if not executable.exists():
        raise SystemExit('Install the pinned local Graphify environment using docs/graphify.md, then rerun.')
    subprocess.run([str(executable), 'extract', '.', '--code-only', '--no-cluster', '--max-workers', '2', '--force'], cwd=ROOT, check=True)
    data = overlay(json.loads(GRAPH.read_text()), sources())
    GRAPH.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    subprocess.run([str(executable), 'cluster-only', '.', '--no-label', '--no-viz'], cwd=ROOT, check=True)
    artifacts = ['graphify-out/graph.json', 'graphify-out/GRAPH_REPORT.md']
    META.write_text(json.dumps(dict(format_version=1, graphify_version='0.9.97',
        source_hashes=sources(), artifact_hashes={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in artifacts}), indent=2, sort_keys=True)+'\n')
    check()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate committed context freshness; standard library only')
    args = parser.parse_args()
    check() if args.check else refresh()
