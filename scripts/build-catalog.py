"""Regenera catálogos locales desde CSV de PokéAPI fijados por SHA; solo biblioteca estándar."""
import csv, io, json, urllib.request
from pathlib import Path
SHA = '89aa167e486774d10d1502ee60bce41dc35f04b2'
ROOT = Path(__file__).resolve().parents[1]
def read(name):
    url=f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{SHA}/data/v2/csv/{name}.csv'
    return list(csv.DictReader(io.StringIO(urllib.request.urlopen(url).read().decode('utf-8'))))
types = dict(enumerate(['Normal','Lucha','Volador','Veneno','Tierra','Roca','Bicho','Fantasma','Acero','Fuego','Agua','Planta','Eléctrico','Psíquico','Hielo','Dragón','Siniestro','Hada'],1))
names={r['pokemon_species_id']:r['name'] for r in read('pokemon_species_names') if r['local_language_id']=='7'}
pt={}
for r in read('pokemon_types'):
    if int(r['type_id']) in types: pt.setdefault(r['pokemon_id'],[]).append((int(r['slot']),types[int(r['type_id'])]))
# Especies por defecto: las formas no incluidas siguen admitiendo entrada manual.
species=[{'id':int(p['id']),'name':names[p['species_id']],'types':[t for _,t in sorted(pt[p['id']])]} for p in read('pokemon') if p['is_default']=='1' and p['species_id'] in names and p['id'] in pt]
mn={r['move_id']:r['name'] for r in read('move_names') if r['local_language_id']=='7'}
# Casos con potencia condicionada, aunque el CSV conserve un valor numérico nominal.
variable_slugs = {'low-kick','flail','reversal','return','present','frustration','magnitude','beat-up','spit-up','eruption','water-spout','gyro-ball','natural-gift','fling','trump-card','wring-out','punishment','grass-knot','crush-grip','heavy-slam','electro-ball','stored-power','heat-crash','power-trip','dragon-energy','hard-press','last-respects','rage-fist','echoed-voice','weather-ball','terrain-pulse','hidden-power'}
fixed={12,32,49,68,69,82,90,101,117,149,162,243,283,329,368,515,698,717,877,894,10013}
num=lambda s:int(s) if s else None
moves=[]
for m in read('moves'):
    mid=int(m['id']); tid=int(m['type_id'])
    if m['id'] not in mn or tid not in types: continue
    category={'1':'Estado','2':'Físico','3':'Especial'}[m['damage_class_id']]
    mode='status' if category=='Estado' else 'fixed' if mid in fixed else 'variable' if m['identifier'] in variable_slugs or not m['power'] or m['power']=='1' else 'number'
    moves.append({'id':mid,'name':mn[m['id']],'type':types[tid],'category':category,'power':num(m['power']) if mode=='number' else None,'powerMode':mode,'accuracy':num(m['accuracy']) if m['accuracy'] not in ('','0') else None,'accuracyMode':'number' if m['accuracy'] not in ('','0') else 'special' if m['accuracy']=='' else 'unknown','priority':int(m['priority'])})
for name,data in [('species',species),('moves',moves)]:
    (ROOT/'src'/'data'/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    print(name,len(data))
