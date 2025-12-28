/**
 * Ingredient Translator - English to Dutch
 * Translates common cooking ingredients for Dutch shopping lists
 */

const translations = {
  // Proteins / Eiwitten
  'chicken': 'kip',
  'chicken breast': 'kipfilet',
  'chicken breasts': 'kipfilets',
  'chicken thighs': 'kippendijen',
  'chicken thigh': 'kippendij',
  'chicken legs': 'kippenpoten',
  'chicken drumsticks': 'kippenpoten',
  'beef': 'rundvlees',
  'ground beef': 'rundergehakt',
  'minced beef': 'rundergehakt',
  'steak': 'biefstuk',
  'pork': 'varkensvlees',
  'pork chops': 'varkenskoteletten',
  'bacon': 'spek',
  'ham': 'ham',
  'sausage': 'worst',
  'sausages': 'worstjes',
  'lamb': 'lamsvlees',
  'fish': 'vis',
  'salmon': 'zalm',
  'tuna': 'tonijn',
  'shrimp': 'garnalen',
  'prawns': 'garnalen',
  'cod': 'kabeljauw',
  'egg': 'ei',
  'eggs': 'eieren',
  'egg white': 'eiwit',
  'egg whites': 'eiwitten',
  'egg yolk': 'eidooier',
  'egg yolks': 'eidooiers',
  'tofu': 'tofu',
  
  // Dairy / Zuivel
  'milk': 'melk',
  'whole milk': 'volle melk',
  'butter': 'boter',
  'cream': 'room',
  'heavy cream': 'slagroom',
  'double cream': 'slagroom',
  'sour cream': 'zure room',
  'cheese': 'kaas',
  'cheddar cheese': 'cheddar kaas',
  'parmesan': 'parmezaanse kaas',
  'parmesan cheese': 'parmezaanse kaas',
  'mozzarella': 'mozzarella',
  'mozzarella cheese': 'mozzarella',
  'feta cheese': 'feta kaas',
  'cream cheese': 'roomkaas',
  'yogurt': 'yoghurt',
  'yoghurt': 'yoghurt',
  'greek yogurt': 'Griekse yoghurt',
  'greek yoghurt': 'Griekse yoghurt',
  
  // Vegetables / Groenten
  'onion': 'ui',
  'onions': 'uien',
  'red onion': 'rode ui',
  'red onions': 'rode uien',
  'garlic': 'knoflook',
  'garlic clove': 'teentje knoflook',
  'garlic cloves': 'teentjes knoflook',
  'tomato': 'tomaat',
  'tomatoes': 'tomaten',
  'cherry tomatoes': 'cherrytomaatjes',
  'potato': 'aardappel',
  'potatoes': 'aardappelen',
  'carrot': 'wortel',
  'carrots': 'wortelen',
  'celery': 'selderij',
  'bell pepper': 'paprika',
  'bell peppers': 'paprika\'s',
  'red pepper': 'rode paprika',
  'green pepper': 'groene paprika',
  'yellow pepper': 'gele paprika',
  'pepper': 'peper',
  'peppers': 'paprika\'s',
  'cucumber': 'komkommer',
  'lettuce': 'sla',
  'spinach': 'spinazie',
  'broccoli': 'broccoli',
  'cauliflower': 'bloemkool',
  'cabbage': 'kool',
  'mushroom': 'champignon',
  'mushrooms': 'champignons',
  'zucchini': 'courgette',
  'courgette': 'courgette',
  'courgettes': 'courgettes',
  'eggplant': 'aubergine',
  'aubergine': 'aubergine',
  'peas': 'doperwten',
  'green beans': 'sperziebonen',
  'beans': 'bonen',
  'corn': 'maïs',
  'sweetcorn': 'maïs',
  'asparagus': 'asperges',
  'leek': 'prei',
  'leeks': 'prei',
  'spring onion': 'bosui',
  'spring onions': 'bosuitjes',
  'scallions': 'bosuitjes',
  'shallot': 'sjalot',
  'shallots': 'sjalotten',
  'ginger': 'gember',
  'chilli': 'chilipeper',
  'chili': 'chilipeper',
  'green chilli': 'groene peper',
  'red chilli': 'rode peper',
  'jalapeño': 'jalapeño peper',
  
  // Fruits / Fruit
  'apple': 'appel',
  'apples': 'appels',
  'banana': 'banaan',
  'bananas': 'bananen',
  'orange': 'sinaasappel',
  'oranges': 'sinaasappels',
  'lemon': 'citroen',
  'lemons': 'citroenen',
  'lime': 'limoen',
  'limes': 'limoenen',
  'strawberry': 'aardbei',
  'strawberries': 'aardbeien',
  'blueberries': 'blauwe bessen',
  'raspberry': 'framboos',
  'raspberries': 'frambozen',
  'grapes': 'druiven',
  'mango': 'mango',
  'pineapple': 'ananas',
  'avocado': 'avocado',
  'coconut': 'kokos',
  'coconut milk': 'kokosmelk',
  
  // Grains & Pasta / Granen & Pasta
  'rice': 'rijst',
  'white rice': 'witte rijst',
  'brown rice': 'bruine rijst',
  'basmati rice': 'basmatirijst',
  'jasmine rice': 'jasmijnrijst',
  'pasta': 'pasta',
  'spaghetti': 'spaghetti',
  'penne': 'penne',
  'noodles': 'noedels',
  'bread': 'brood',
  'flour': 'bloem',
  'plain flour': 'bloem',
  'all purpose flour': 'bloem',
  'self-raising flour': 'zelfrijzend bakmeel',
  'bread crumbs': 'paneermeel',
  'breadcrumbs': 'paneermeel',
  'oats': 'haver',
  'couscous': 'couscous',
  'quinoa': 'quinoa',
  
  // Oils & Fats / Oliën & Vetten
  'oil': 'olie',
  'olive oil': 'olijfolie',
  'vegetable oil': 'plantaardige olie',
  'sunflower oil': 'zonnebloemolie',
  'sesame oil': 'sesamolie',
  'sesame seed oil': 'sesamolie',
  'coconut oil': 'kokosolie',
  'canola oil': 'koolzaadolie',
  
  // Herbs & Spices / Kruiden & Specerijen
  'salt': 'zout',
  'pepper': 'peper',
  'black pepper': 'zwarte peper',
  'white pepper': 'witte peper',
  'paprika': 'paprikapoeder',
  'cumin': 'komijn',
  'ground cumin': 'gemalen komijn',
  'coriander': 'koriander',
  'ground coriander': 'koriander poeder',
  'cinnamon': 'kaneel',
  'turmeric': 'kurkuma',
  'turmeric powder': 'kurkumapoeder',
  'ginger': 'gember',
  'ground ginger': 'gemberpoeder',
  'nutmeg': 'nootmuskaat',
  'oregano': 'oregano',
  'basil': 'basilicum',
  'thyme': 'tijm',
  'rosemary': 'rozemarijn',
  'parsley': 'peterselie',
  'cilantro': 'koriander',
  'mint': 'munt',
  'dill': 'dille',
  'bay leaf': 'laurierblad',
  'bay leaves': 'laurierblaadjes',
  'chili powder': 'chilipoeder',
  'chilli powder': 'chilipoeder',
  'curry powder': 'kerriepoeder',
  'garam masala': 'garam masala',
  'allspice': 'piment',
  'cloves': 'kruidnagel',
  'cardamom': 'kardemom',
  'fennel seeds': 'venkelzaad',
  'cumin seeds': 'komijnzaad',
  'coriander seeds': 'korianderzaad',
  'mustard': 'mosterd',
  'mustard seeds': 'mosterdzaad',
  'dijon mustard': 'dijonmosterd',
  
  // Sauces & Condiments / Sauzen
  'soy sauce': 'sojasaus',
  'fish sauce': 'vissaus',
  'tomato sauce': 'tomatensaus',
  'tomato paste': 'tomatenpuree',
  'tomato puree': 'tomatenpuree',
  'ketchup': 'ketchup',
  'tomato ketchup': 'ketchup',
  'mayonnaise': 'mayonaise',
  'vinegar': 'azijn',
  'white vinegar': 'witte azijn',
  'red wine vinegar': 'rode wijnazijn',
  'balsamic vinegar': 'balsamico azijn',
  'rice vinegar': 'rijstazijn',
  'worcestershire sauce': 'worcestersaus',
  'hot sauce': 'hete saus',
  'oyster sauce': 'oestersaus',
  'hoisin sauce': 'hoisinsaus',
  'honey': 'honing',
  'maple syrup': 'ahornsiroop',
  'passata': 'passata',
  
  // Canned & Dried / Blik & Gedroogd
  'tinned tomatoes': 'blik tomaten',
  'canned tomatoes': 'blik tomaten',
  'chopped tomatoes': 'gehakte tomaten (blik)',
  'tomato passata': 'passata',
  'chickpeas': 'kikkererwten',
  'lentils': 'linzen',
  'kidney beans': 'kidneybonen',
  'black beans': 'zwarte bonen',
  'baked beans': 'witte bonen in tomatensaus',
  'butter beans': 'boterbonen',
  'stock': 'bouillon',
  'chicken stock': 'kippenbouillon',
  'beef stock': 'runderbouillon',
  'vegetable stock': 'groentebouillon',
  'stock cube': 'bouillonblokje',
  'chicken stock cube': 'kippenbouillonblokje',
  
  // Baking / Bakken
  'sugar': 'suiker',
  'brown sugar': 'bruine suiker',
  'caster sugar': 'fijne suiker',
  'powdered sugar': 'poedersuiker',
  'icing sugar': 'poedersuiker',
  'baking powder': 'bakpoeder',
  'baking soda': 'baksoda',
  'yeast': 'gist',
  'vanilla': 'vanille',
  'vanilla extract': 'vanille-extract',
  'cocoa powder': 'cacaopoeder',
  'chocolate': 'chocolade',
  'dark chocolate': 'pure chocolade',
  'milk chocolate': 'melkchocolade',
  'chocolate chips': 'chocoladeschilfers',
  'cornstarch': 'maizena',
  'corn flour': 'maïszetmeel',
  'corn starch': 'maizena',
  'starch': 'zetmeel',
  'potato starch': 'aardappelzetmeel',
  
  // Nuts & Seeds / Noten & Zaden
  'almonds': 'amandelen',
  'walnuts': 'walnoten',
  'peanuts': 'pinda\'s',
  'cashews': 'cashewnoten',
  'pine nuts': 'pijnboompitten',
  'sesame seeds': 'sesamzaad',
  'sunflower seeds': 'zonnebloempitten',
  'pumpkin seeds': 'pompoenpitten',
  'peanut butter': 'pindakaas',
  
  // Drinks / Dranken
  'water': 'water',
  'wine': 'wijn',
  'red wine': 'rode wijn',
  'white wine': 'witte wijn',
  'beer': 'bier',
  'sake': 'sake',
  'dry white wine': 'droge witte wijn',
  
  // Other / Overig
  'olives': 'olijven',
  'black olives': 'zwarte olijven',
  'green olives': 'groene olijven',
  'capers': 'kappertjes',
  'anchovies': 'ansjovis',
  'sun-dried tomatoes': 'zongedroogde tomaten',
  'raisins': 'rozijnen',
  'dried apricots': 'gedroogde abrikozen',
  'dates': 'dadels',
  'water chestnuts': 'waterkastaanjes',
  'bamboo shoots': 'bamboescheuten',
  'tortilla': 'tortilla',
  'tortillas': 'tortilla\'s',
  'wraps': 'wraps',
  'pita bread': 'pitabrood',
  'naan': 'naanbrood',
  'chorizo': 'chorizo',
  'fenugreek': 'fenegriek',
  'tamarind': 'tamarinde',
  'miso': 'miso',
  'tahini': 'tahini',
  'harissa': 'harissa',
  'sriracha': 'sriracha',
  'lemongrass': 'citroengras',
  'lime leaves': 'limoenblaadjes',
  'kaffir lime leaves': 'kaffir limoenblaadjes',
  'thai basil': 'Thaise basilicum',
  'roasted pepper': 'geroosterde paprika',
  'granulated sugar': 'kristalsuiker',
  'kosher salt': 'grof zout',
};

// Measurements / Maateenheden
const measurementTranslations = {
  'cup': 'kopje',
  'cups': 'kopjes',
  'tablespoon': 'eetlepel',
  'tablespoons': 'eetlepels',
  'tbsp': 'el',
  'tblsp': 'el',
  'tbs': 'el',
  'teaspoon': 'theelepel',
  'teaspoons': 'theelepels',
  'tsp': 'tl',
  'pound': 'pond',
  'pounds': 'pond',
  'lb': 'pond',
  'lbs': 'pond',
  'ounce': 'ons',
  'ounces': 'ons',
  'oz': 'ons',
  'pinch': 'snufje',
  'handful': 'handvol',
  'bunch': 'bosje',
  'clove': 'teentje',
  'cloves': 'teentjes',
  'slice': 'plak',
  'slices': 'plakken',
  'piece': 'stuk',
  'pieces': 'stukken',
  'can': 'blik',
  'cans': 'blikken',
  'jar': 'pot',
  'jars': 'potten',
  'to taste': 'naar smaak',
  'to serve': 'om te serveren',
  'as required': 'naar behoefte',
  'garnish': 'garnering',
  'for frying': 'om in te bakken',
  'large': 'grote',
  'small': 'kleine',
  'medium': 'middelgrote',
  'fresh': 'verse',
  'dried': 'gedroogde',
  'chopped': 'gehakt',
  'minced': 'gehakt',
  'sliced': 'gesneden',
  'diced': 'in blokjes',
  'crushed': 'geperst',
  'grated': 'geraspt',
  'peeled': 'geschild',
  'whole': 'hele',
  'boneless': 'zonder been',
  'skinless': 'zonder vel',
  'thinly sliced': 'dun gesneden',
  'finely chopped': 'fijngesneden',
  'roughly chopped': 'grof gehakt',
};

class IngredientTranslator {
  /**
   * Translate an ingredient name from English to Dutch
   * @param {string} ingredient - English ingredient name
   * @returns {string} - Dutch translation or original if not found
   */
  translateIngredient(ingredient) {
    if (!ingredient) return ingredient;
    
    const lower = ingredient.toLowerCase().trim();
    
    // Try exact match first
    if (translations[lower]) {
      return translations[lower];
    }
    
    // Try to find partial matches
    let translated = ingredient;
    
    // Sort keys by length (longest first) to match "chicken breast" before "chicken"
    const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
    
    for (const eng of sortedKeys) {
      const regex = new RegExp(`\\b${eng}\\b`, 'gi');
      if (regex.test(translated)) {
        translated = translated.replace(regex, translations[eng]);
      }
    }
    
    return translated;
  }
  
  /**
   * Translate a measurement from English to Dutch
   * @param {string} measure - English measurement
   * @returns {string} - Dutch translation or original if not found
   */
  translateMeasure(measure) {
    if (!measure) return measure;
    
    let translated = measure;
    
    // Sort keys by length (longest first)
    const sortedKeys = Object.keys(measurementTranslations).sort((a, b) => b.length - a.length);
    
    for (const eng of sortedKeys) {
      const regex = new RegExp(`\\b${eng}\\b`, 'gi');
      if (regex.test(translated)) {
        translated = translated.replace(regex, measurementTranslations[eng]);
      }
    }
    
    return translated;
  }
  
  /**
   * Translate a full ingredient line (measure + ingredient)
   * @param {string} displayText - Full ingredient text like "2 cups chicken breast"
   * @returns {string} - Dutch translation
   */
  translateDisplayText(displayText) {
    if (!displayText) return displayText;
    
    let translated = displayText;
    
    // First translate measurements
    translated = this.translateMeasure(translated);
    
    // Then translate ingredients
    translated = this.translateIngredient(translated);
    
    // Capitalize first letter
    if (translated.length > 0) {
      translated = translated.charAt(0).toUpperCase() + translated.slice(1);
    }
    
    return translated;
  }
  
  /**
   * Translate a recipe name (basic translation of common words)
   * @param {string} name - English recipe name
   * @returns {string} - Partially translated name
   */
  translateRecipeName(name) {
    if (!name) return name;
    
    const recipeWords = {
      'chicken': 'Kip',
      'beef': 'Rundvlees',
      'pork': 'Varkensvlees',
      'lamb': 'Lams',
      'fish': 'Vis',
      'salmon': 'Zalm',
      'shrimp': 'Garnalen',
      'soup': 'Soep',
      'salad': 'Salade',
      'pasta': 'Pasta',
      'rice': 'Rijst',
      'curry': 'Curry',
      'stew': 'Stoofpot',
      'roast': 'Gebraden',
      'fried': 'Gebakken',
      'grilled': 'Gegrild',
      'baked': 'Gebakken',
      'pie': 'Taart',
      'cake': 'Cake',
      'bread': 'Brood',
      'sandwich': 'Sandwich',
      'burger': 'Burger',
      'pizza': 'Pizza',
      'pancakes': 'Pannenkoeken',
      'omelette': 'Omelet',
      'with': 'met',
      'and': 'en',
    };
    
    let translated = name;
    
    for (const [eng, nl] of Object.entries(recipeWords)) {
      const regex = new RegExp(`\\b${eng}\\b`, 'gi');
      translated = translated.replace(regex, nl);
    }
    
    return translated;
  }

  /**
   * Translate category name to Dutch
   */
  translateCategory(category) {
    const categoryTranslations = {
      'beef': 'Rundvlees',
      'chicken': 'Kip',
      'dessert': 'Dessert',
      'lamb': 'Lam',
      'miscellaneous': 'Diversen',
      'pasta': 'Pasta',
      'pork': 'Varkensvlees',
      'seafood': 'Vis & Zeevruchten',
      'side': 'Bijgerechten',
      'starter': 'Voorgerechten',
      'vegan': 'Veganistisch',
      'vegetarian': 'Vegetarisch',
      'breakfast': 'Ontbijt',
      'goat': 'Geit',
    };
    
    const lower = category.toLowerCase();
    return categoryTranslations[lower] || category;
  }
}

module.exports = new IngredientTranslator();
