/**
 * One-shot generator for the local 118-element chemistry dataset.
 * Run: node scripts/generate-elements.js
 */
const fs = require('fs')
const path = require('path')

/**
 * Compact row format:
 * [Z, symbol, nameRu, nameEn, period, group|null, category, mass, hintRu]
 */
const rows = [
	[1, 'H', 'Водород', 'Hydrogen', 1, 1, 'nonmetal', 1.008, 'Самый лёгкий элемент. Символ H — от латинского Hydrogenium.'],
	[2, 'He', 'Гелий', 'Helium', 1, 18, 'noble-gas', 4.002602, 'Инертный газ. Открыт сначала на Солнце по спектральным линиям.'],
	[3, 'Li', 'Литий', 'Lithium', 2, 1, 'alkali-metal', 6.94, 'Щелочной металл. Легче воды и активно с ней реагирует.'],
	[4, 'Be', 'Бериллий', 'Beryllium', 2, 2, 'alkaline-earth-metal', 9.0121831, 'Лёгкий щёлочноземельный металл. Токсичен в пыли.'],
	[5, 'B', 'Бор', 'Boron', 2, 13, 'metalloid', 10.81, 'Металлоид. Важен для стекла и полупроводников.'],
	[6, 'C', 'Углерод', 'Carbon', 2, 14, 'nonmetal', 12.011, 'Основа органической химии. Аллотропы: алмаз, графит, фуллерены.'],
	[7, 'N', 'Азот', 'Nitrogen', 2, 15, 'nonmetal', 14.007, 'Составляет около 78% воздуха. Символ N — от Nitrogenium.'],
	[8, 'O', 'Кислород', 'Oxygen', 2, 16, 'nonmetal', 15.999, 'Необходим для дыхания. Молекула O₂ поддерживает горение.'],
	[9, 'F', 'Фтор', 'Fluorine', 2, 17, 'halogen', 18.998403163, 'Самый электроотрицательный элемент. Очень активный галоген.'],
	[10, 'Ne', 'Неон', 'Neon', 2, 18, 'noble-gas', 20.1797, 'Благородный газ. Даёт красно-оранжевое свечение в лампах.'],
	[11, 'Na', 'Натрий', 'Sodium', 3, 1, 'alkali-metal', 22.98976928, 'Щелочной металл. Символ Na связан с латинским Natrium.'],
	[12, 'Mg', 'Магний', 'Magnesium', 3, 2, 'alkaline-earth-metal', 24.305, 'Горит ярким белым пламенем. Важен для хлорофилла.'],
	[13, 'Al', 'Алюминий', 'Aluminium', 3, 13, 'post-transition-metal', 26.9815385, 'Лёгкий конструкционный металл. Пассивируется оксидной плёнкой.'],
	[14, 'Si', 'Кремний', 'Silicon', 3, 14, 'metalloid', 28.085, 'Основа полупроводников и кварца. Второй по распространённости в коре.'],
	[15, 'P', 'Фосфор', 'Phosphorus', 3, 15, 'nonmetal', 30.973761998, 'Нужен для ДНК и АТФ. Белый фосфор светится на воздухе.'],
	[16, 'S', 'Сера', 'Sulfur', 3, 16, 'nonmetal', 32.06, 'Жёлтый неметалл. Важна для белков и серной кислоты.'],
	[17, 'Cl', 'Хлор', 'Chlorine', 3, 17, 'halogen', 35.45, 'Галоген группы 17. Широко используется для обеззараживания воды.'],
	[18, 'Ar', 'Аргон', 'Argon', 3, 18, 'noble-gas', 39.948, 'Третий по содержанию газ атмосферы. Инертен.'],
	[19, 'K', 'Калий', 'Potassium', 4, 1, 'alkali-metal', 39.0983, 'Щелочной металл. Символ K — от латинского Kalium.'],
	[20, 'Ca', 'Кальций', 'Calcium', 4, 2, 'alkaline-earth-metal', 40.078, 'Основа костей и известняка. Щёлочноземельный металл.'],
	[21, 'Sc', 'Скандий', 'Scandium', 4, 3, 'transition-metal', 44.955908, 'Лёгкий переходный металл. Назван в честь Скандинавии.'],
	[22, 'Ti', 'Титан', 'Titanium', 4, 4, 'transition-metal', 47.867, 'Прочный и лёгкий. Устойчив к коррозии.'],
	[23, 'V', 'Ванадий', 'Vanadium', 4, 5, 'transition-metal', 50.9415, 'Добавка в высокопрочные стали.'],
	[24, 'Cr', 'Хром', 'Chromium', 4, 6, 'transition-metal', 51.9961, 'Даёт нержавеющим сталям коррозионную стойкость.'],
	[25, 'Mn', 'Марганец', 'Manganese', 4, 7, 'transition-metal', 54.938044, 'Важен для сталей и биологических ферментов.'],
	[26, 'Fe', 'Железо', 'Iron', 4, 8, 'transition-metal', 55.845, 'Самый используемый конструкционный металл. Символ Fe — Ferrum.'],
	[27, 'Co', 'Кобальт', 'Cobalt', 4, 9, 'transition-metal', 58.933194, 'Синие пигменты и суперсплавы. Магнитен.'],
	[28, 'Ni', 'Никель', 'Nickel', 4, 10, 'transition-metal', 58.6934, 'Монеты, нержавеющие стали и катализаторы.'],
	[29, 'Cu', 'Медь', 'Copper', 4, 11, 'transition-metal', 63.546, 'Отличный проводник. Символ Cu — Cuprum.'],
	[30, 'Zn', 'Цинк', 'Zinc', 4, 12, 'transition-metal', 65.38, 'Гальванизация стали. Важен для ферментов.'],
	[31, 'Ga', 'Галлий', 'Gallium', 4, 13, 'post-transition-metal', 69.723, 'Плавится в руке. Используют в полупроводниках.'],
	[32, 'Ge', 'Германий', 'Germanium', 4, 14, 'metalloid', 72.63, 'Металлоид для электроники и оптики.'],
	[33, 'As', 'Мышьяк', 'Arsenic', 4, 15, 'metalloid', 74.921595, 'Токсичный металлоид. Исторически известен как яд.'],
	[34, 'Se', 'Селен', 'Selenium', 4, 16, 'nonmetal', 78.971, 'Фоточувствительный неметалл. Нужен в следовых дозах.'],
	[35, 'Br', 'Бром', 'Bromine', 4, 17, 'halogen', 79.904, 'Единственный жидкий неметалл при комнатной температуре.'],
	[36, 'Kr', 'Криптон', 'Krypton', 4, 18, 'noble-gas', 83.798, 'Благородный газ. Используют в освещении.'],
	[37, 'Rb', 'Рубидий', 'Rubidium', 5, 1, 'alkali-metal', 85.4678, 'Мягкий щелочной металл. Очень реактивен.'],
	[38, 'Sr', 'Стронций', 'Strontium', 5, 2, 'alkaline-earth-metal', 87.62, 'Даёт красный цвет фейерверкам.'],
	[39, 'Y', 'Иттрий', 'Yttrium', 5, 3, 'transition-metal', 88.90584, 'Переходный металл. Важен для фосфоров и сплавов.'],
	[40, 'Zr', 'Цирконий', 'Zirconium', 5, 4, 'transition-metal', 91.224, 'Устойчив в ядерных реакторах и химической аппаратуре.'],
	[41, 'Nb', 'Ниобий', 'Niobium', 5, 5, 'transition-metal', 92.90637, 'Суперпроводники и высокопрочные сплавы.'],
	[42, 'Mo', 'Молибден', 'Molybdenum', 5, 6, 'transition-metal', 95.95, 'Упрочняет стали. Важен для ферментов.'],
	[43, 'Tc', 'Технеций', 'Technetium', 5, 7, 'transition-metal', 98, 'Первый искусственно полученный элемент. Радиоактивен.'],
	[44, 'Ru', 'Рутений', 'Ruthenium', 5, 8, 'transition-metal', 101.07, 'Металл платиновой группы. Катализатор.'],
	[45, 'Rh', 'Родий', 'Rhodium', 5, 9, 'transition-metal', 102.9055, 'Редкий и дорогой. В катализаторах выхлопа.'],
	[46, 'Pd', 'Палладий', 'Palladium', 5, 10, 'transition-metal', 106.42, 'Катализ и ювелирные сплавы. Поглощает водород.'],
	[47, 'Ag', 'Серебро', 'Silver', 5, 11, 'transition-metal', 107.8682, 'Лучший электрический проводник среди металлов. Символ Ag — Argentum.'],
	[48, 'Cd', 'Кадмий', 'Cadmium', 5, 12, 'transition-metal', 112.414, 'Токсичный металл. Исторически в батареях NiCd.'],
	[49, 'In', 'Индий', 'Indium', 5, 13, 'post-transition-metal', 114.818, 'Мягкий металл. Ключевой для ITO-покрытий дисплеев.'],
	[50, 'Sn', 'Олово', 'Tin', 5, 14, 'post-transition-metal', 118.71, 'Символ Sn — Stannum. Защищает от коррозии в жести.'],
	[51, 'Sb', 'Сурьма', 'Antimony', 5, 15, 'metalloid', 121.76, 'Металлоид. Символ Sb — Stibium.'],
	[52, 'Te', 'Теллур', 'Tellurium', 5, 16, 'metalloid', 127.6, 'Редкий металлоид. Используют в сплавах и полупроводниках.'],
	[53, 'I', 'Иод', 'Iodine', 5, 17, 'halogen', 126.90447, 'Галоген. Нужен щитовидной железе. Фиолетовые пары.'],
	[54, 'Xe', 'Ксенон', 'Xenon', 5, 18, 'noble-gas', 131.293, 'Тяжёлый благородный газ. Даёт яркий свет в лампах.'],
	[55, 'Cs', 'Цезий', 'Caesium', 6, 1, 'alkali-metal', 132.90545196, 'Самый электроположительный стабильный металл. Атомные часы.'],
	[56, 'Ba', 'Барий', 'Barium', 6, 2, 'alkaline-earth-metal', 137.327, 'Даёт зелёный цвет пламени. Сульфат бария — контраст в рентгене.'],
	[57, 'La', 'Лантан', 'Lanthanum', 6, 3, 'lanthanide', 138.90547, 'Первый из лантаноидов. Начинает f-блок.'],
	[58, 'Ce', 'Церий', 'Cerium', 6, null, 'lanthanide', 140.116, 'Самый распространённый редкоземельный элемент.'],
	[59, 'Pr', 'Празеодим', 'Praseodymium', 6, null, 'lanthanide', 140.90766, 'Даёт зелёные оттенки стеклу и керамике.'],
	[60, 'Nd', 'Неодим', 'Neodymium', 6, null, 'lanthanide', 144.242, 'Сильные постоянные магниты NdFeB.'],
	[61, 'Pm', 'Прометий', 'Promethium', 6, null, 'lanthanide', 145, 'Радиоактивный лантаноид. В природе почти не встречается.'],
	[62, 'Sm', 'Самарий', 'Samarium', 6, null, 'lanthanide', 150.36, 'Магниты и ядерные управляющие стержни.'],
	[63, 'Eu', 'Европий', 'Europium', 6, null, 'lanthanide', 151.964, 'Красные и синие люминофоры в дисплеях.'],
	[64, 'Gd', 'Гадолиний', 'Gadolinium', 6, null, 'lanthanide', 157.25, 'Сильно парамагнитен. Контраст в МРТ.'],
	[65, 'Tb', 'Тербий', 'Terbium', 6, null, 'lanthanide', 158.92535, 'Зелёные люминофоры и магнитострикционные сплавы.'],
	[66, 'Dy', 'Диспрозий', 'Dysprosium', 6, null, 'lanthanide', 162.5, 'Улучшает высокотемпературные магниты.'],
	[67, 'Ho', 'Гольмий', 'Holmium', 6, null, 'lanthanide', 164.93033, 'Сильнейший магнитный момент среди элементов.'],
	[68, 'Er', 'Эрбий', 'Erbium', 6, null, 'lanthanide', 167.259, 'Усилители в оптоволоконной связи.'],
	[69, 'Tm', 'Тулий', 'Thulium', 6, null, 'lanthanide', 168.93422, 'Самый редкий из стабильных лантаноидов.'],
	[70, 'Yb', 'Иттербий', 'Ytterbium', 6, null, 'lanthanide', 173.045, 'Лазеры и атомные часы нового поколения.'],
	[71, 'Lu', 'Лютеций', 'Lutetium', 6, null, 'lanthanide', 174.9668, 'Последний лантаноид. Плотный и редкий.'],
	[72, 'Hf', 'Гафний', 'Hafnium', 6, 4, 'transition-metal', 178.49, 'Химически похож на цирконий. В управляющих стержнях.'],
	[73, 'Ta', 'Тантал', 'Tantalum', 6, 5, 'transition-metal', 180.94788, 'Коррозионностойкий. Конденсаторы электроники.'],
	[74, 'W', 'Вольфрам', 'Tungsten', 6, 6, 'transition-metal', 183.84, 'Очень высокая температура плавления. Символ W — Wolfram.'],
	[75, 'Re', 'Рений', 'Rhenium', 6, 7, 'transition-metal', 186.207, 'Один из самых редких металлов. Суперсплавы.'],
	[76, 'Os', 'Осмий', 'Osmium', 6, 8, 'transition-metal', 190.23, 'Один из самых плотных элементов.'],
	[77, 'Ir', 'Иридий', 'Iridium', 6, 9, 'transition-metal', 192.217, 'Очень коррозионностойкий металл платиновой группы.'],
	[78, 'Pt', 'Платина', 'Platinum', 6, 10, 'transition-metal', 195.084, 'Катализатор и ювелирный металл.'],
	[79, 'Au', 'Золото', 'Gold', 6, 11, 'transition-metal', 196.966569, 'Благородный металл. Символ Au — Aurum.'],
	[80, 'Hg', 'Ртуть', 'Mercury', 6, 12, 'transition-metal', 200.592, 'Единственный жидкий металл при комнатной температуре. Символ Hg — Hydrargyrum.'],
	[81, 'Tl', 'Таллий', 'Thallium', 6, 13, 'post-transition-metal', 204.38, 'Токсичный мягкий металл. Исторически использовался в ядах.'],
	[82, 'Pb', 'Свинец', 'Lead', 6, 14, 'post-transition-metal', 207.2, 'Тяжёлый металл. Символ Pb — Plumbum.'],
	[83, 'Bi', 'Висмут', 'Bismuth', 6, 15, 'post-transition-metal', 208.9804, 'Малотоксичный тяжёлый металл. Красивые оксидные цвета.'],
	[84, 'Po', 'Полоний', 'Polonium', 6, 16, 'post-transition-metal', 209, 'Сильно радиоактивен. Открыт Марией Кюри.'],
	[85, 'At', 'Астат', 'Astatine', 6, 17, 'halogen', 210, 'Редчайший природный галоген. Радиоактивен.'],
	[86, 'Rn', 'Радон', 'Radon', 6, 18, 'noble-gas', 222, 'Радиоактивный благородный газ. Накапливается в помещениях.'],
	[87, 'Fr', 'Франций', 'Francium', 7, 1, 'alkali-metal', 223, 'Самый тяжёлый щелочной металл. Крайне радиоактивен.'],
	[88, 'Ra', 'Радий', 'Radium', 7, 2, 'alkaline-earth-metal', 226, 'Радиоактивный щёлочноземельный. Исторически в люминесцентных красках.'],
	[89, 'Ac', 'Актиний', 'Actinium', 7, 3, 'actinide', 227, 'Первый актиноид. Сильно радиоактивен.'],
	[90, 'Th', 'Торий', 'Thorium', 7, null, 'actinide', 232.0377, 'Потенциальное ядерное топливо. Длинноживущий изотоп.'],
	[91, 'Pa', 'Протактиний', 'Protactinium', 7, null, 'actinide', 231.03588, 'Редкий актиноид между торием и ураном.'],
	[92, 'U', 'Уран', 'Uranium', 7, null, 'actinide', 238.02891, 'Ключевой элемент ядерной энергетики. Символ U.'],
	[93, 'Np', 'Нептуний', 'Neptunium', 7, null, 'actinide', 237, 'Первый трансурановый элемент.'],
	[94, 'Pu', 'Плутоний', 'Plutonium', 7, null, 'actinide', 244, 'Ядерное топливо и оружейный материал. Радиоактивен.'],
	[95, 'Am', 'Америций', 'Americium', 7, null, 'actinide', 243, 'Используют в дымовых извещателях (изотоп Am-241).'],
	[96, 'Cm', 'Кюрий', 'Curium', 7, null, 'actinide', 247, 'Назван в честь супругов Кюри.'],
	[97, 'Bk', 'Берклий', 'Berkelium', 7, null, 'actinide', 247, 'Синтезирован в Беркли. Трансурановый актиноид.'],
	[98, 'Cf', 'Калифорний', 'Californium', 7, null, 'actinide', 251, 'Мощный источник нейтронов.'],
	[99, 'Es', 'Эйнштейний', 'Einsteinium', 7, null, 'actinide', 252, 'Назван в честь Эйнштейна. Получен после ядерного испытания.'],
	[100, 'Fm', 'Фермий', 'Fermium', 7, null, 'actinide', 257, 'Назван в честь Энрико Ферми.'],
	[101, 'Md', 'Менделевий', 'Mendelevium', 7, null, 'actinide', 258, 'Назван в честь Дмитрия Менделеева.'],
	[102, 'No', 'Нобелий', 'Nobelium', 7, null, 'actinide', 259, 'Назван в честь Альфреда Нобеля.'],
	[103, 'Lr', 'Лоуренсий', 'Lawrencium', 7, null, 'actinide', 266, 'Последний актиноид. Назван в честь Эрнеста Лоуренса.'],
	[104, 'Rf', 'Резерфордий', 'Rutherfordium', 7, 4, 'transition-metal', 267, 'Трансактиноид группы 4. Назван в честь Резерфорда.'],
	[105, 'Db', 'Дубний', 'Dubnium', 7, 5, 'transition-metal', 268, 'Назван в честь Дубны. Группа 5.'],
	[106, 'Sg', 'Сиборгий', 'Seaborgium', 7, 6, 'transition-metal', 269, 'Назван в честь Гленна Сиборга.'],
	[107, 'Bh', 'Борий', 'Bohrium', 7, 7, 'transition-metal', 270, 'Назван в честь Нильса Бора.'],
	[108, 'Hs', 'Хассий', 'Hassium', 7, 8, 'transition-metal', 269, 'Назван в честь земли Гессен (Hassia).'],
	[109, 'Mt', 'Мейтнерий', 'Meitnerium', 7, 9, 'transition-metal', 278, 'Назван в честь Лизы Мейтнер.'],
	[110, 'Ds', 'Дармштадтий', 'Darmstadtium', 7, 10, 'transition-metal', 281, 'Назван в честь Дармштадта.'],
	[111, 'Rg', 'Рентгений', 'Roentgenium', 7, 11, 'transition-metal', 282, 'Назван в честь Вильгельма Рентгена.'],
	[112, 'Cn', 'Коперниций', 'Copernicium', 7, 12, 'transition-metal', 285, 'Назван в честь Николая Коперника.'],
	[113, 'Nh', 'Нихоний', 'Nihonium', 7, 13, 'post-transition-metal', 286, 'Первый элемент, открытый в Азии. Nihon — Япония.'],
	[114, 'Fl', 'Флеровий', 'Flerovium', 7, 14, 'post-transition-metal', 289, 'Назван в честь лаборатории Флёрова.'],
	[115, 'Mc', 'Московий', 'Moscovium', 7, 15, 'post-transition-metal', 290, 'Назван в честь Московской области.'],
	[116, 'Lv', 'Ливерморий', 'Livermorium', 7, 16, 'post-transition-metal', 293, 'Назван в честь Ливерморской лаборатории.'],
	[117, 'Ts', 'Теннессин', 'Tennessine', 7, 17, 'halogen', 294, 'Галоген группы 17. Назван в честь штата Теннесси.'],
	[118, 'Og', 'Оганесон', 'Oganesson', 7, 18, 'noble-gas', 294, 'Самый тяжёлый известный элемент. Назван в честь Юрия Оганесяна.'],
]

const categoryToClassification = {
	'alkali-metal': 'metal',
	'alkaline-earth-metal': 'metal',
	'transition-metal': 'metal',
	'post-transition-metal': 'metal',
	metalloid: 'metalloid',
	nonmetal: 'nonmetal',
	halogen: 'nonmetal',
	'noble-gas': 'nonmetal',
	lanthanide: 'metal',
	actinide: 'metal',
}

function esc(s) {
	return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

const lines = []
lines.push("import type { ChemicalElement } from './types'")
lines.push('')
lines.push('/**')
lines.push(' * Local source-of-truth dataset: all 118 official chemical elements.')
lines.push(' * No network dependency. Values follow modern IUPAC naming.')
lines.push(' */')
lines.push('export const ELEMENTS: readonly ChemicalElement[] = [')

for (const row of rows) {
	const [z, symbol, nameRu, nameEn, period, group, category, mass, hintRu] = row
	const classification = categoryToClassification[category]
	const groupLit = group === null ? 'null' : String(group)
	lines.push('\t{')
	lines.push(`\t\tatomicNumber: ${z},`)
	lines.push(`\t\tsymbol: '${symbol}',`)
	lines.push(`\t\tnameRu: '${esc(nameRu)}',`)
	lines.push(`\t\tnameEn: '${esc(nameEn)}',`)
	lines.push(`\t\tperiod: ${period},`)
	lines.push(`\t\tgroup: ${groupLit},`)
	lines.push(`\t\tcategory: '${category}',`)
	lines.push(`\t\tclassification: '${classification}',`)
	lines.push(`\t\tatomicMass: ${mass},`)
	lines.push(`\t\thintRu: '${esc(hintRu)}',`)
	lines.push('\t},')
}

lines.push('] as const')
lines.push('')
lines.push('export const ELEMENTS_BY_ATOMIC_NUMBER: ReadonlyMap<number, ChemicalElement> =')
lines.push('\tnew Map(ELEMENTS.map((el) => [el.atomicNumber, el]))')
lines.push('')
lines.push('export const ELEMENTS_BY_SYMBOL: ReadonlyMap<string, ChemicalElement> =')
lines.push('\tnew Map(ELEMENTS.map((el) => [el.symbol, el]))')
lines.push('')
lines.push('/** Elements that have a concrete IUPAC main-table group (1–18). */')
lines.push('export function getElementsWithGroup(): ChemicalElement[] {')
lines.push('\treturn ELEMENTS.filter((el) => el.group !== null)')
lines.push('}')
lines.push('')
lines.push('export function getElementByAtomicNumber(atomicNumber: number): ChemicalElement | undefined {')
lines.push('\treturn ELEMENTS_BY_ATOMIC_NUMBER.get(atomicNumber)')
lines.push('}')
lines.push('')

if (rows.length !== 118) {
	throw new Error(`Expected 118 rows, got ${rows.length}`)
}

const out = path.join(__dirname, '..', 'src', 'data', 'chemistry', 'elements.ts')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8')
console.log(`Wrote ${rows.length} elements to ${out}`)
