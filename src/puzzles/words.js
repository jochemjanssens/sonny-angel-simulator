// Dutch puzzle words around the blind-box themes, each with a short clue for
// the Swedish puzzle. Words are uppercase without spaces (IJ counts as I + J).

export const WORD_CATEGORIES = [
  {
    id: 'dieren',
    name: 'Dieren',
    en: 'Animals',
    icon: '🐰',
    words: [
      ['KAT', 'Miauwt'], ['HOND', 'Blaft'], ['KONIJN', 'Lange oren'], ['OLIFANT', 'Heeft een slurf'],
      ['LEEUW', 'Koning der dieren'], ['TIJGER', 'Gestreepte katachtige'], ['PANDA', 'Eet bamboe'],
      ['KOALA', 'Knuffelt bomen'], ['AAP', 'Slingert in bomen'], ['KIKKER', 'Kwaakt'], ['SCHAAP', 'Geeft wol'],
      ['KOE', 'Geeft melk'], ['VARKEN', 'Knort'], ['MUIS', 'Houdt van kaas'], ['GIRAF', 'Lange nek'],
      ['ZEBRA', 'Zwart-wit gestreept'], ['VOS', 'Sluwe roodharige'], ['UIL', 'Nachtvogel'],
      ['BEER', 'Houdt winterslaap'], ['EEND', 'Kwakende vogel'], ['NIJLPAARD', 'Groot, in de rivier'],
    ],
  },
  {
    id: 'fruit',
    name: 'Fruit',
    en: 'Fruit',
    icon: '🍓',
    words: [
      ['APPEL', 'Valt niet ver van de boom'], ['PEER', 'Fruit en lamp'], ['BANAAN', 'Krom en geel'],
      ['KERS', 'Rood met steeltje'], ['AARDBEI', 'Rood met pitjes'], ['DRUIF', 'Groeit in trossen'],
      ['CITROEN', 'Zuur en geel'], ['MELOEN', 'Groot en sappig'], ['KIWI', 'Bruin en harig'],
      ['PERZIK', 'Zacht en donzig'], ['ANANAS', 'Heeft een kroon'], ['MANGO', 'Tropische vrucht'],
      ['PRUIM', 'Paarse steenvrucht'], ['BES', 'Klein rond vruchtje'], ['VIJG', 'Zoet, vol pitjes'],
      ['LIMOEN', 'Groene citrus'], ['FRAMBOOS', 'Rode bes'],
    ],
  },
  {
    id: 'groenten',
    name: 'Groenten',
    en: 'Vegetables',
    icon: '🥕',
    words: [
      ['WORTEL', 'Konijnen smullen ervan'], ['TOMAAT', 'Rood, in ketchup'], ['KOOL', 'Groeit in kroppen'],
      ['PREI', 'Lange groene stengel'], ['AUBERGINE', 'Paarse groente'], ['BROCCOLI', 'Groene boompjes'],
      ['MAIS', 'Gele korrels'], ['ERWT', 'Groen bolletje'], ['KOMKOMMER', 'Lang en groen'],
      ['PAPRIKA', 'Rood, geel of groen'], ['SPINAZIE', 'Popeye eet het'], ['RADIJS', 'Klein en rood'],
      ['POMPOEN', 'Oranje reus'], ['BIET', 'Rode knol'], ['SLA', 'Basis van salade'], ['ASPERGE', 'Wit goud'],
    ],
  },
  {
    id: 'zee',
    name: 'Zee',
    en: 'Sea',
    icon: '🐬',
    words: [
      ['VIS', 'Zwemt met kieuwen'], ['WALVIS', 'Grootste zoogdier'], ['DOLFIJN', 'Slim zeezoogdier'],
      ['HAAI', 'Scherpe tanden'], ['KRAB', 'Loopt zijwaarts'], ['OCTOPUS', 'Acht armen'],
      ['KWAL', 'Doorzichtig, prikt'], ['ZEEHOND', 'Snorharen, zwemt'], ['SCHILDPAD', 'Draagt zijn huis'],
      ['ZEESTER', 'Vijf armen'], ['KREEFT', 'Rode scharen'], ['SCHELP', 'Ligt op het strand'],
      ['GOLF', 'Water in beweging'], ['STRAND', 'Zand bij zee'], ['ZEEPAARD', 'Zwemt rechtop'], ['KOGELVIS', 'Blaast zich op'],
    ],
  },
  {
    id: 'bloemen',
    name: 'Bloemen',
    en: 'Flowers',
    icon: '🌸',
    words: [
      ['ROOS', 'Heeft doornen'], ['TULP', 'Hollandse bloem'], ['MADELIEF', 'Kleine witte bloem'],
      ['LELIE', 'Statige bloem'], ['ZONNEBLOEM', 'Draait naar de zon'], ['LAVENDEL', 'Paars en geurig'],
      ['ANJER', 'Bloem in knoopsgat'], ['VIOOLTJE', 'Klein en paars'], ['HORTENSIA', 'Grote bolle bloem'],
      ['DAHLIA', 'Knolbloem'], ['IRIS', 'Ook in je oog'], ['ORCHIDEE', 'Exotische bloem'],
      ['KROKUS', 'Vroege lentebloem'], ['BLOESEM', 'Bloei aan bomen'], ['MAGNOLIA', 'Boom met grote bloemen'],
    ],
  },
  {
    id: 'snoep',
    name: 'Snoep',
    en: 'Sweets',
    icon: '🧁',
    words: [
      ['SNOEP', 'Zoetigheid'], ['TAART', 'Voor je verjaardag'], ['KOEKJE', 'Bij de thee'], ['DONUT', 'Rond met gat'],
      ['IJSJE', 'Koud in een hoorntje'], ['CHOCOLA', 'Gemaakt van cacao'], ['MACARON', 'Frans koekje'],
      ['LOLLY', 'Snoep op een stokje'], ['PUDDING', 'Trillend toetje'], ['CUPCAKE', 'Mini-taartje'],
      ['WAFEL', 'Met ruitjes'], ['DROP', 'Zwart en zout'], ['SPEKJE', 'Zacht snoepje'],
      ['ZUURTJE', 'Hard snoepje'], ['SUIKER', 'Zoet poeder'], ['SLAGROOM', 'Wit en luchtig'],
    ],
  },
  {
    id: 'huisdieren',
    name: 'Katten & honden',
    en: 'Cats & dogs',
    icon: '🐶',
    words: [
      ['POES', 'Vrouwtjeskat'], ['KITTEN', 'Jong katje'], ['PUP', 'Jong hondje'], ['POEDEL', 'Gekrulde hond'],
      ['TECKEL', 'Worsthond'], ['CORGI', 'Koninklijke hond'], ['HUSKY', 'Sledehond'], ['MOPS', 'Platte snuit'],
      ['SNORHAAR', 'Voelspriet van kat'], ['POOT', 'Geeft een hond'], ['STAART', 'Kwispelt'],
      ['BLAFFEN', 'Wat een hond doet'], ['SPINNEN', 'Tevreden kat'], ['MANDJE', 'Slaapplek'],
      ['BOT', 'Hondensnack'], ['COCKAPOO', 'Cocker x poedel'], ['RIEM', 'Om mee te wandelen'],
    ],
  },
  {
    id: 'insecten',
    name: 'Insecten',
    en: 'Insects',
    icon: '🐞',
    words: [
      ['BIJ', 'Maakt honing'], ['MIER', 'Harde werker'], ['VLINDER', 'Kleurrijke vleugels'],
      ['KEVER', 'Harde schilden'], ['SLAK', 'Huisje op de rug'], ['RUPS', 'Wordt een vlinder'],
      ['LIBEL', 'Snelle vlieger'], ['MUG', 'Prikt in de nacht'], ['VLIEG', 'Zoemt rond'],
      ['SPRINKHAAN', 'Springt hoog'], ['KREKEL', 'Tjirpt'], ['MOT', 'Vliegt naar het licht'],
      ['WESP', 'Geel-zwart, prikt'], ['HOMMEL', 'Dikke bij'], ['VUURVLIEG', 'Geeft licht'], ['SPIN', 'Weeft een web'],
    ],
  },
  {
    id: 'feest',
    name: 'Feestdagen',
    en: 'Holidays',
    icon: '🎃',
    words: [
      ['KERST', '25 december'], ['PASEN', 'Eieren zoeken'], ['HALLOWEEN', 'Griezelfeest'], ['CADEAU', 'Pakje'],
      ['SNEEUWPOP', 'Wortel als neus'], ['RENDIER', 'Trekt de slee'], ['PAASEI', 'Verstopt in de tuin'],
      ['SPOOK', 'Boe!'], ['HEKS', 'Vliegt op een bezem'], ['VALENTIJN', 'Feest van de liefde'],
      ['HARTJE', 'Teken van liefde'], ['KAARS', 'Brandt met een vlam'], ['KERSTBOOM', 'Met ballen versierd'],
      ['SLINGER', 'Feestversiering'], ['PIEK', 'Bovenop de boom'], ['LAMPION', 'Lichtje aan een stok'],
    ],
  },
  {
    id: 'blindbox',
    name: 'Blind box',
    en: 'Blind box',
    icon: '🎁',
    words: [
      ['ENGELTJE', 'Kleine engel'], ['VLEUGELS', 'Om mee te vliegen'], ['DOOSJE', 'Klein pakje'],
      ['VERRASSING', 'Onverwacht'], ['GEHEIM', 'Zeldzame figuur'], ['ZELDZAAM', 'Komt weinig voor'],
      ['VERZAMELEN', 'Sparen'], ['PLANK', 'Waar ze staan'], ['RUILEN', 'Wisselen'], ['BOD', 'Prijsvoorstel'],
      ['FIGUURTJE', 'Klein beeldje'], ['SCHATTIG', 'Lief om te zien'], ['MUTSJE', 'Op het hoofd'],
      ['HALO', 'Ring boven het hoofd'], ['COLLECTIE', 'Verzameling'], ['DUPLICAAT', 'Dubbel exemplaar'], ['FOLIE', 'Verpakking'],
    ],
  },
]

export const CATEGORY_BY_ID = Object.fromEntries(WORD_CATEGORIES.map((c) => [c.id, c]))
