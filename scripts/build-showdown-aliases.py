"""Alias ingleses por ID desde la misma instantánea PokéAPI que los catálogos."""
import csv, io, json, urllib.request
from pathlib import Path
SHA = '89aa167e486774d10d1502ee60bce41dc35f04b2'
root = Path(__file__).resolve().parents[1]
def read(name):
    with urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{SHA}/data/v2/csv/{name}.csv') as f:
        return list(csv.DictReader(io.StringIO(f.read().decode())))
result = {}
for kind, table, key, local in [('species','pokemon_species_names','pokemon_species_id','species'), ('moves','move_names','move_id','moves'), ('abilities','ability_names','ability_id','ability-catalog'), ('items','item_names','item_id','item-catalog')]:
    ids = {e['id'] for e in json.loads((root / f'src/data/{local}.json').read_text())}
    # pokemon IDs del catálogo por defecto pueden diferir de los IDs de especie.
    mapping = {int(p['species_id']):int(p['id']) for p in read('pokemon') if p['is_default']=='1'} if kind=='species' else None
    result[kind] = {str(mapping.get(int(r[key]), -1) if mapping else int(r[key])):r['name'] for r in read(table) if r['local_language_id']=='9' and (mapping.get(int(r[key]), -1) if mapping else int(r[key])) in ids}
(root/'src/data/showdown-aliases.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',',':'))+'\n')
