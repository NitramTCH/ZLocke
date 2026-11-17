"""Catálogo español local de habilidades/objetos, misma revisión fija de PokéAPI."""
import csv, io, json, urllib.request
from pathlib import Path
SHA='89aa167e486774d10d1502ee60bce41dc35f04b2'
ROOT=Path(__file__).resolve().parents[1]
def read(name):
    with urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{SHA}/data/v2/csv/{name}.csv') as response:
        return list(csv.DictReader(io.StringIO(response.read().decode())))
for kind in ['ability','item']:
    key=f'{kind}_id'
    names={r[key]:r['name'] for r in read(f'{kind}_names') if r['local_language_id']=='7'}
    desc={}
    for r in read(f'{kind}_flavor_text'):
        if r.get('language_id',r.get('local_language_id'))=='7':
            rank=int(r.get('version_group_id',r.get('version_id','0')))
            if rank>=desc.get(r[key],(-1,''))[0]: desc[r[key]]=(rank,' '.join(r['flavor_text'].split()))
    entries=[{'id':int(r['id']),'slug':r['identifier'],'name':names[r['id']],'description':desc.get(r['id'],(0,'Descripción no disponible en la fuente española.'))[1]} for r in read('abilities' if kind=='ability' else 'items') if r['id'] in names]
    (ROOT/'src/data'/f'{kind}-catalog.json').write_text(json.dumps(entries,ensure_ascii=False,separators=(',',':'))+'\n')
    print(kind,len(entries))
