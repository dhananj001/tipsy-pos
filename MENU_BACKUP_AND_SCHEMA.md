# TIPSY POS - Official Menu Backup & Database Specification

> **Source Files Synchronized**:
> - `TIPSY BBE NM (1).XLSX` (Food & All Time Favourites)
> - `BarMenu.xlsx` (Full Bar & Spirits Pricing)
> 
> **Total Categories**: 40  
> **Total Menu Items**: 552  
> **Generated At**: October 2026  

---

## 1. Database Schema Reference

```sql
-- Categories Table
CREATE TABLE menu_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    printer_type VARCHAR(50) DEFAULT 'kitchen', -- 'kitchen' | 'bar' | 'billing'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Menu Items Table
CREATE TABLE menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    printer_type VARCHAR(50) DEFAULT 'kitchen', -- 'kitchen' | 'bar' | 'billing'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

## 2. Categories Summary

| # | Category Name | Destination Station | Item Count |
|---|---|---|---|
| 1 | **VEG-APPETIZERS** | `kitchen` | 13 |
| 2 | **NON VEG APPETIZERS** | `kitchen` | 20 |
| 3 | **SOUP / FRESH SALAD** | `kitchen` | 22 |
| 4 | **TANDOOR** | `kitchen` | 19 |
| 5 | **PIZZA & NAANZA** | `kitchen` | 17 |
| 6 | **PASTA** | `kitchen` | 17 |
| 7 | **THE DESI TABLE (MAINS)** | `kitchen` | 28 |
| 8 | **THE GLOBAL TABLE (MAINS)** | `kitchen` | 9 |
| 9 | **CHEF'S SPECIAL - THAI CURRY** | `kitchen` | 3 |
| 10 | **FRIED RICE / NOODLES** | `kitchen` | 6 |
| 11 | **BURNT GARLIC RICE / NOODLES** | `kitchen` | 2 |
| 12 | **SIDE BY SIDE ORDER** | `kitchen` | 8 |
| 13 | **NACHOS & SOFT SHELL TACOS** | `kitchen` | 16 |
| 14 | **BIRYANIS** | `kitchen` | 6 |
| 15 | **DESSERT** | `kitchen` | 8 |
| 16 | **BARBITES** | `kitchen` | 21 |
| 17 | **BURGERS & TOASTS** | `kitchen` | 18 |
| 18 | **BAO'S AND DUMPLINGS** | `kitchen` | 8 |
| 19 | **WINGS IN BONE** | `kitchen` | 3 |
| 20 | **BONELESS WINGS** | `kitchen` | 3 |
| 21 | **ALL ABOUT WINGS** | `kitchen` | 2 |
| 22 | **CLASSIC COCKTAILS** | `bar` | 15 |
| 23 | **INVENTED COCKTAILS** | `bar` | 17 |
| 24 | **BUILT TALL** | `bar` | 10 |
| 25 | **SPARKLING COCKTAILS** | `bar` | 4 |
| 26 | **SANGRIA** | `bar` | 8 |
| 27 | **DRAUGHT BEER** | `bar` | 12 |
| 28 | **SHOTS** | `bar` | 6 |
| 29 | **PREMIUM WHISKEY** | `bar` | 60 |
| 30 | **IMPORTED WHISKEY** | `bar` | 27 |
| 31 | **SINGLE MALT WHISKEY** | `bar` | 15 |
| 32 | **VODKA** | `bar` | 24 |
| 33 | **GIN** | `bar` | 18 |
| 34 | **RUM AND BRANDY** | `bar` | 15 |
| 35 | **SOFT BEVERAGES** | `bar` | 9 |
| 36 | **BEERS & BREEZERS** | `bar` | 32 |
| 37 | **WINE** | `bar` | 18 |
| 38 | **LIQUEURS** | `bar` | 4 |
| 39 | **TEQUILA (SHOTS)** | `bar` | 3 |
| 40 | **MOCKTAILS** | `bar` | 6 |

---

## 3. Complete Menu Item Catalog

### 1. VEG-APPETIZERS (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| STUFF BAKED MUSHROOM | ₹400 | `kitchen` | - |
| FALAFEL PITA POCKETS | ₹430 | `kitchen` | - |
| FALAFEL WITH HUMMUS | ₹400 | `kitchen` | - |
| THECHA COATED GRILLED PANEER | ₹430 | `kitchen` | - |
| VEGGIE CROQUETTES | ₹420 | `kitchen` | - |
| STIR SAUTED VEGETABLES | ₹420 | `kitchen` | - |
| BUTTER GARLIC VEGITABLE | ₹430 | `kitchen` | - |
| GHEE ROAST SOYA CHAP | ₹380 | `kitchen` | - |
| GANTUR PANEER | ₹400 | `kitchen` | - |
| ASIAN CHILLI MUSHROOM | ₹400 | `kitchen` | - |
| JOIE | ₹450 | `kitchen` | - |
| CLASSIC/GUNTUR PANEER CHILLI | ₹430 | `kitchen` | - |
| PERI PERI PANEER SKEWARS | ₹450 | `kitchen` | - |

### 2. NON VEG APPETIZERS (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| FISH FINGERS AND TATER SAUCE | ₹580 | `kitchen` | - |
| ORANGE GLAZE CHICKEN | ₹430 | `kitchen` | - |
| CHILLI CHICKEN | ₹430 | `kitchen` | - |
| SRIRACHA PRAWNS | ₹650 | `kitchen` | - |
| SALT AND PEPPER CHICKEN | ₹450 | `kitchen` | - |
| TAWA FISH | ₹630 | `kitchen` | - |
| GHEE ROAST PRAWNS | ₹650 | `kitchen` | - |
| GARLIC CHICKEN BAKED BITE BUN | ₹500 | `kitchen` | Tuscan garlic-infused chicken, oven-kissed, nestled in a golden, artisanal brioche. |
| LUDA | ₹450 | `kitchen` | - |
| BANG BANG CHICKEN | ₹480 | `kitchen` | - |
| PATRA FISH | ₹680 | `kitchen` | - |
| INDONESIAN CHICKEN SKEWARS | ₹480 | `kitchen` | - |
| ONE NIGHT IN PHUKET SPICY SHRIMP | ₹630 | `kitchen` | - |
| PERI PERI CHICKEN SKEWARS | ₹480 | `kitchen` | - |
| 4 YAAR CHICKEN | ₹500 | `kitchen` | - |
| LAWRENCE TAWA CHICKEN WITH KALA DARU | ₹480 | `kitchen` | - |
| CHICKEN IN DA BASKET | ₹520 | `kitchen` | - |
| GUNTUR CHICKEN | ₹480 | `kitchen` | - |
| GOAN KING | ₹650 | `kitchen` | - |
| TIPSY LAMB | ₹700 | `kitchen` | - |

### 3. SOUP / FRESH SALAD (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| LEMON CORIANDER HOT BROTH VEG | ₹230 | `kitchen` | - |
| LEMON CORIANDER HOT BROTH NON-VEG | ₹280 | `kitchen` | - |
| ALMOND BROCCOLI SOUP VEG | ₹260 | `kitchen` | - |
| ALMOND BROCCOLI SOUP CHICKEN | ₹300 | `kitchen` | - |
| MANCHOW SOUP VEG | ₹230 | `kitchen` | - |
| MANCHOW SOUP CHICKEN | ₹280 | `kitchen` | - |
| CREAM OF TOMATO SOUP | ₹230 | `kitchen` | - |
| CREAM OF MUSHROOM SOUP | ₹280 | `kitchen` | - |
| CREAM OF BROCCOLI SOUP | ₹280 | `kitchen` | - |
| INSALATA CAESAR VEG | ₹320 | `kitchen` | - |
| INSALATA CAESAR CHICKEN | ₹370 | `kitchen` | - |
| INSALATA CAESAR SHRIMP | ₹420 | `kitchen` | - |
| AVOCADO SALAD VEG | ₹350 | `kitchen` | - |
| AVOCADO SALAD CHICKEN | ₹400 | `kitchen` | - |
| AVOCADO SALAD SHRIMP | ₹440 | `kitchen` | - |
| MEXICAN SALAD VEG | ₹320 | `kitchen` | - |
| MEXICAN SALAD CHICKEN | ₹370 | `kitchen` | - |
| MEXICAN SALAD SHRIMP | ₹440 | `kitchen` | - |
| GREEK SALAD VEG | ₹320 | `kitchen` | - |
| GREEK SALAD CHICKEN | ₹370 | `kitchen` | - |
| GREEK SALAD SHRIMP | ₹440 | `kitchen` | - |
| APPLE WALNUT SALAD | ₹350 | `kitchen` | - |

### 4. TANDOOR (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| PESHAWARI PANEER TIKKA | ₹440 | `kitchen` | - |
| AFGHANI PANEER TIKKA | ₹440 | `kitchen` | - |
| BHARWAN KUMBH KEBAB | ₹450 | `kitchen` | - |
| CLASSIC PANEER TIKKA | ₹430 | `kitchen` | - |
| SOYA CHAP TANDOORI KEBAB | ₹380 | `kitchen` | - |
| TANDOORI MUSHROOM | ₹400 | `kitchen` | - |
| CLAY OVEN ROASTED LOLLYPOP | ₹530 | `kitchen` | - |
| 8PM CHICKEN | ₹550 | `kitchen` | - |
| CILANTRO GARLIC CHICKEN TIKKA | ₹500 | `kitchen` | - |
| LANGDA CHICKEN | ₹550 | `kitchen` | - |
| CHEF’S SPECIAL JWALA MURGH | ₹830 | `kitchen` | Lusious whole chicken marinated in chef’s Maharashtrian GAVRAN style spicy masala & charcoal smoke topped with rum fire. |
| CHEFS MATKA CHICKEN | ₹480 | `kitchen` | - |
| SHIKHARI MURG ( EXTRA SPICY ) | ₹480 | `kitchen` | Chef special boneless chicken marinated overnight in full spicy shikari masala, not for the fainthearted |
| BHATTI DA MURG HALF | ₹500 | `kitchen` | - |
| BHATTI DA MURG FULL | ₹800 | `kitchen` | - |
| KAFIR LIME INFUSED KEBAB | ₹550 | `kitchen` | - |
| CAJUN TANDOORI JHINGA | ₹630 | `kitchen` | - |
| THE TIPPSY VEG PLATTER | ₹1250 | `kitchen` | - |
| THE TIPPSY NON VEG PLATTER | ₹1580 | `kitchen` | - |

### 5. PIZZA & NAANZA (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| CLASSIC MARGHERITA PIZZA | ₹400 | `kitchen` | - |
| TANDOORI VEG PIZZA | ₹450 | `kitchen` | Savor a vibrant Tandoori Veg Pizza, a symphony of spiced vegetables and smoky flavors on a crispy crust. |
| CHEESY BLAST PIZZA | ₹460 | `kitchen` | Four types of cheese, cheese lovers must try, yummy |
| FULL HOUSE EXOTIC PIZZA | ₹460 | `kitchen` | All types of exotic vegetable and mozzarella cheese, cheese sauce |
| JAMAICAN PANEER PIZZA | ₹550 | `kitchen` | Jamican garlic paneer, three bell pepper,olives,cheese |
| SPICY PERI PERI COTTAGE CHEESE PIZZA | ₹550 | `kitchen` | cottage cheese tossed in peri peri spices top on thai chilli , red yellow cup, cheese |
| CHICKEN OVERLOAD CHICKEN PIZZA | ₹600 | `kitchen` | Everything chicken keema, grilled chicken, Jamaican chicken, loaded with cheese |
| JAMAICAN GARLIC CHICKEN PIZZA | ₹520 | `kitchen` | Succulent jerk chicken, sweet peppers, and creamy garlic sauce on a crispy crust. |
| CHICKEN PEPPERONI PIZZA | ₹550 | `kitchen` | Savor artisanal chicken pepperoni, premium cheeses, and a crispy crust, a symphony of savory delights. |
| SEA FOOD PIZZA | ₹680 | `kitchen` | Indulge in a luxurious seafood pizza, a symphony of oceanic flavors atop a perfectly crisp crust |
| LASSONI CHICKEN PIZZA | ₹520 | `kitchen` | - |
| MUTTON ROGAN PIZZA | ₹700 | `kitchen` | - |
| LAAL MIRCH CHICKEN PIZZA | ₹520 | `kitchen` | - |
| MEXICAN VEGGIE NAANZA | ₹400 | `kitchen` | - |
| PANEER MAKHANI NAANZA | ₹400 | `kitchen` | - |
| KOLHAPURI CHICKEN KHEEMA NAANZA | ₹450 | `kitchen` | - |
| MAKHAN CHICKEN NAANZA | ₹450 | `kitchen` | - |

### 6. PASTA (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| VEG CRUST CANNELLONI | ₹480 | `kitchen` | Savory vegetable-stuffed cannelloni, cradled in a golden-baked crust, a symphony of flavors. |
| CHEF'S SPECIAL EXOTIC VEG LASAGNE | ₹530 | `kitchen` | Gluten -free Hand made pasta sheet. amazing layers of exotic veg. loaded with cheese baked to perfection on plate |
| PENNE PASTA VEG | ₹400 | `kitchen` | NAPOLITAN /ALFREDO /PINK SAUCE |
| PENNE PASTA CHICKEN | ₹450 | `kitchen` | NAPOLITAN /ALFREDO /PINK SAUCE |
| SPAGHETTI AGLIO OLIO | ₹480 | `kitchen` | - |
| SPAGHETTI CREAMY ALFREDO | ₹520 | `kitchen` | - |
| CHEF'S SPECIAL CHICKEN BOLOGNESE LASAGNE | ₹580 | `kitchen` | Gluten free hand crafted sheets of pasta amazing layers of minced chicken. loaded with cheese |
| CHEF'S SPECIAL CHICKEN BOLOGNESE PENNE | ₹480 | `kitchen` | Gluten free hand crafted sheets of pasta amazing layers of minced chicken. loaded with cheese |
| CHEF'S SPECIAL CHICKEN BOLOGNESE SPAGHETTI | ₹500 | `kitchen` | Gluten free hand crafted sheets of pasta amazing layers of minced chicken. loaded with cheese |
| POLLO PEPPERY MAC & CHEESE | ₹480 | `kitchen` | - |
| PASTA AL PESTO VEG | ₹480 | `kitchen` | Vibrant, emerald pesto, crafted from fragrant basil and pine nuts, elegantly coats perfectly al dente pasta, a symphony of Mediterranean freshness. |
| PASTA AL PESTO CHICKEN | ₹520 | `kitchen` | Vibrant, emerald pesto, crafted from fragrant basil and pine nuts, elegantly coats perfectly al dente pasta, a symphony of Mediterranean freshness. |
| KOLHAPURI CHICKEN CANNELLONI | ₹580 | `kitchen` | Savory chicken and ricotta, rolled in pasta, baked in a rich tomato sauce, a symphony of Italian flavors. |
| BUTTER CHICKEN CANNELLONI | ₹580 | `kitchen` | Savory chicken and ricotta, rolled in pasta, baked in a rich tomato sauce, a symphony of Italian flavors. |
| PASTA BARBARESCA | ₹420 | `kitchen` | - |
| CHICKEN SPAGHETTI AGLIO OLIO | ₹420 | `kitchen` | - |
| CHICKEN SPAGHETTI CREAMY ALFREDO | ₹480 | `kitchen` | - |

### 7. THE DESI TABLE (MAINS) (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| MALABAR GREEN CURRY | ₹400 | `kitchen` | - |
| VEG JALFREZZI | ₹430 | `kitchen` | All types of vegetable cooked in special spicy yummy gravy |
| TIPPSY PANEER KHUMAS | ₹480 | `kitchen` | Velvety paneer medallions in a rich, aromatic cashew-tomato gravy, adorned with nuts, cream biryani rice-a royal Indian indulgence. |
| PANEER BUTTER MASALA | ₹450 | `kitchen` | - |
| PANEER TIKKA MASALA | ₹430 | `kitchen` | Tandoor paneer in a rich, creamy, spiced tomato gravy—a delightful Indian vegetarian curry. |
| VEG DEEVANI | ₹400 | `kitchen` | - |
| VILAYATI SABZI | ₹450 | `kitchen` | - |
| TAWA SAJI | ₹400 | `kitchen` | - |
| CHEFS SPECIAL MURGH KHUMAS | ₹580 | `kitchen` | Chicken keema cooked in Indian gravy half tandoori chicken & biryani rice |
| GAVRAN STYLE CHICKEN RASSA | ₹480 | `kitchen` | Gavran style chicken masala is a rustic, flavorful Maharashtrian dish featuring tender chicken in a spicy, aromatic gravy. |
| BUTTER CHICKEN | ₹480 | `kitchen` | Delicious, creamy chicken in a rich tomato gravy, thoda mitha thoda teekha. Perfect with naan! |
| CHICKEN CHETTINAD | ₹480 | `kitchen` | - |
| MUTTON CHETTINAD | ₹680 | `kitchen` | - |
| MUTTON ROGAN JOSH | ₹680 | `kitchen` | - |
| CHICKEN KALA RASSA | ₹480 | `kitchen` | - |
| MUTTON KALA RASSA | ₹680 | `kitchen` | - |
| CHICKEN RA RA | ₹500 | `kitchen` | - |
| MUTTON RA RA | ₹700 | `kitchen` | - |
| GOAN FISH CURRY | ₹680 | `kitchen` | - |
| MALVANI FISH CURRY | ₹680 | `kitchen` | - |
| MACHAR ZOL | ₹550 | `kitchen` | - |
| DAL FRY | ₹300 | `kitchen` | - |
| DAL TADKA | ₹350 | `kitchen` | - |
| DAL PALAK | ₹350 | `kitchen` | - |
| MA KI DAAL | ₹400 | `kitchen` | - |
| DESI GHEE DAL KHICHADI | ₹320 | `kitchen` | - |
| CHICKEN DAL KHICHADI | ₹450 | `kitchen` | - |
| MUTTON DAL KHICHADI | ₹550 | `kitchen` | - |

### 8. THE GLOBAL TABLE (MAINS) (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| BURMESE KHOW SUEY VEG | ₹520 | `kitchen` | Layers of curried coconut noodles, tender protein, and an array of crisp toppings create a symphony of textures and tastes. |
| BURMESE KHOW SUEY CHICKEN | ₹550 | `kitchen` | Layers of curried coconut noodles, tender protein, and an array of crisp toppings create a symphony of textures and tastes. |
| PAD THAI VEG | ₹520 | `kitchen` | - |
| PAD THAI SEAFOOD | ₹650 | `kitchen` | - |
| GRILLED FISH WITH DEMIGLAZE SAUCE | ₹520 | `kitchen` | - |
| CHICKEN ROULADE | ₹500 | `kitchen` | - |
| HERB CRUSTED CHICKEN | ₹490 | `kitchen` | Chicken breast marinated in herbs with mash potato & veggies onside , serve with demi glaze sauce |
| CAJUN PRAWNS | ₹650 | `kitchen` | Juicy prawns marinated in bold Cajun spices, grilled to perfection, served sizzling hot with zesty dip and smoky herb aroma. |
| MINTY THYME LAMB STEAK | ₹700 | `kitchen` | Seared lamb steak, infused with fresh mint and thyme, sides with mashed potato & sauted vegetables offering a sophisticated, aromatic, and tender culinary experience. |

### 9. CHEF'S SPECIAL - THAI CURRY (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| THAI CURRY VEGETABLE (RED/GREEN) | ₹520 | `kitchen` | CHEF'S SPECIAL- SMOOTHING COCONUT MILK, THAI CURRY WITH BUTTER HERBS RICE |
| THAI CURRY CHICKEN (RED/GREEN) | ₹570 | `kitchen` | CHEF'S SPECIAL- SMOOTHING COCONUT MILK, THAI CURRY WITH BUTTER HERBS RICE |
| THAI CURRY PRAWN (RED/GREEN) | ₹650 | `kitchen` | CHEF'S SPECIAL- SMOOTHING COCONUT MILK, THAI CURRY WITH BUTTER HERBS RICE |

### 10. FRIED RICE / NOODLES (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| FRIED RICE / NOODLES VEGETABLE | ₹330 | `kitchen` | - |
| FRIED RICE / NOODLES CHICKEN | ₹380 | `kitchen` | - |
| FRIED RICE / NOODLES SEAFOOD | ₹450 | `kitchen` | - |
| CHILLI GARLIC NOODLES | ₹400 | `kitchen` | - |
| TRIPLE RICE / NOODLES VEG | ₹350 | `kitchen` | - |
| TRIPLE RICE / NOODLES NON-VEG | ₹400 | `kitchen` | - |

### 11. BURNT GARLIC RICE / NOODLES (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| BURNT GARLIC RICE / NOODLES VEG | ₹350 | `kitchen` | - |
| BURNT GARLIC RICE / NOODLES CHICKEN | ₹400 | `kitchen` | - |

### 12. SIDE BY SIDE ORDER (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| ROTI | ₹60 | `kitchen` | - |
| MAKHAN ROTI | ₹70 | `kitchen` | - |
| NAAN | ₹80 | `kitchen` | - |
| MAKHAN NAAN | ₹90 | `kitchen` | - |
| BUTTER GARLIC NAAN | ₹120 | `kitchen` | - |
| BUTTER CHEESE GARLIC NAAN | ₹150 | `kitchen` | - |
| STEAMED RICE | ₹120 | `kitchen` | - |
| JEERA RICE | ₹120 | `kitchen` | - |

### 13. NACHOS & SOFT SHELL TACOS (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| CRUST CHEESY NACHOS | ₹380 | `kitchen` | - |
| NACHOS WITH SALSA | ₹330 | `kitchen` | - |
| GHEE ROST CHICKEN NACHOS | ₹420 | `kitchen` | - |
| LOADED BEANS NACHOS VEG | ₹380 | `kitchen` | - |
| LOADED BEANS NACHOS CHICKEN | ₹400 | `kitchen` | - |
| MANHATTAN NACHOS | ₹400 | `kitchen` | - |
| LOADED BBQ CHICKEN NACHOS | ₹430 | `kitchen` | - |
| BUTTER CHICKEN TACOS | ₹430 | `kitchen` | - |
| KOLHAPURI CHICKEN TACOS | ₹430 | `kitchen` | - |
| CHICKEN STRIPES NACHOS | ₹450 | `kitchen` | - |
| CFS PRWANS NACHOS | ₹510 | `kitchen` | - |
| AFGHANI TACOS VEG | ₹400 | `kitchen` | - |
| AFGHANI TACOS CHICKEN | ₹430 | `kitchen` | - |
| HARABHARA TACOS | ₹410 | `kitchen` | - |
| CAJUN PANEER TACOS | ₹430 | `kitchen` | - |
| CREAMY VEG TACOS | ₹410 | `kitchen` | - |

### 14. BIRYANIS (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| MUGHLAI CHICKEN BIRYANI | ₹490 | `kitchen` | - |
| MATKKA CHICKEN DUM BIRYANI | ₹540 | `kitchen` | - |
| PRAWNS BIRYANI | ₹620 | `kitchen` | - |
| MUTTON DUM BIRYANI | ₹650 | `kitchen` | - |
| MUGHLAI VEG BIRYANI | ₹450 | `kitchen` | - |
| MATKA VEG BIRYANI | ₹460 | `kitchen` | - |

### 15. DESSERT (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| HOT CHOCOLATE SIZZLING BROWNIE WITH ICE CREAM | ₹310 | `kitchen` | - |
| PANNA COTTA | ₹350 | `kitchen` | - |
| MISSISSIPPI MUD PIE | ₹350 | `kitchen` | - |
| BURNT BASQUE CHEESE CAKE | ₹400 | `kitchen` | - |
| TIRAMISU | ₹350 | `kitchen` | - |
| MOONG DAL CIGAR ROLL | ₹350 | `kitchen` | - |
| TRES LECHES | ₹420 | `kitchen` | - |
| SHAHI TUKDA | ₹300 | `kitchen` | - |

### 16. BARBITES (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| CHANA JOR GARAM | ₹120 | `kitchen` | - |
| MASLEDAR DAANE | ₹120 | `kitchen` | - |
| BOILLED CORN CHAT | ₹120 | `kitchen` | - |
| NACHANI PAPAD | ₹80 | `kitchen` | - |
| MASALA NACHANI PAPAD | ₹120 | `kitchen` | - |
| CLASSIC MASALA PAPAD | ₹100 | `kitchen` | - |
| POTATO STRIPS BOWL | ₹220 | `kitchen` | - |
| POTATO WEDGES SALTED | ₹220 | `kitchen` | - |
| POTATO WEDGES PERI-PERI | ₹250 | `kitchen` | - |
| CAJUN CRUMB ONION RINGS | ₹260 | `kitchen` | - |
| BEER BATTERED ONION RINGS | ₹300 | `kitchen` | - |
| BIRD PEPPER CHILI CORN | ₹360 | `kitchen` | - |
| THECHA COATED GRILLED PANEER | ₹420 | `kitchen` | - |
| JALAPEÑO CHEESE BALLS | ₹390 | `kitchen` | - |
| CHICKEN POPCORN | ₹420 | `kitchen` | - |
| MUSHROOM BROCCOLI STIRED FRY | ₹350 | `kitchen` | - |
| NAL STOP ANDA BHURJEE | ₹300 | `kitchen` | - |
| BOILLED EGG BHURJEE | ₹350 | `kitchen` | - |
| KHEEMA PAV | ₹500 | `kitchen` | - |
| ASSORTED PAKODA | ₹250 | `kitchen` | - |
| THE TIPPSY BITES PLATTER ( FOUR SORTS ) | ₹520 | `kitchen` | - |

### 17. BURGERS & TOASTS (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| SMASHED BURGER VEG | ₹360 | `kitchen` | - |
| SMASHED BURGER CHICKEN | ₹450 | `kitchen` | - |
| CLASSIC VEG BURGER | ₹350 | `kitchen` | - |
| COTTAGE CHEESE PERI PERI BURGER | ₹350 | `kitchen` | - |
| ALOO TIKKI BURGER | ₹300 | `kitchen` | - |
| BEAST BURGER | ₹400 | `kitchen` | - |
| CHICKEN BOMBER BURGER | ₹420 | `kitchen` | - |
| VEGGIE BOMBER BURGER | ₹380 | `kitchen` | - |
| CRISPY FRIED CHICKEN BURGER | ₹430 | `kitchen` | - |
| SPICY GHOST ON TOAST | ₹400 | `kitchen` | - |
| AVOCADO TOAST | ₹320 | `kitchen` | - |
| AVOCADO BRUSCHETTA | ₹320 | `kitchen` | - |
| CHEESE CHILLY TOAST | ₹280 | `kitchen` | - |
| GARLIC COTTAGE CHEESE BAKED BITE BUN | ₹480 | `kitchen` | - |
| GARLIC CHICKEN BAKED BITE BUN | ₹500 | `kitchen` | - |
| CHICKEN BRUSCHETTA | ₹320 | `kitchen` | - |
| MUSHROOM BRUSCHETTA | ₹320 | `kitchen` | - |
| CHEESY CHICKEN ON TOAST | ₹300 | `kitchen` | - |

### 18. BAO'S AND DUMPLINGS (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| CHA SU PANEER BAO | ₹400 | `kitchen` | - |
| ASIAN EXOTIC VEGETABLE BAO | ₹350 | `kitchen` | - |
| CHA SU CHICKEN BAO | ₹400 | `kitchen` | - |
| ASIAN CHICKEN BAO | ₹450 | `kitchen` | - |
| FISH TALE BAO | ₹480 | `kitchen` | - |
| BEETROOT DUMPLING | ₹320 | `kitchen` | - |
| VEG DUMPLING | ₹320 | `kitchen` | - |
| CHICKEN DUMPLING | ₹350 | `kitchen` | - |

### 19. WINGS IN BONE (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| WINGS IN BONE - SMOKY BBQ SAUCE | ₹400 | `kitchen` | Tossed in your choice of sauce and served with house made ranch |
| WINGS IN BONE - PERI PERI SAUCE | ₹420 | `kitchen` | Tossed in your choice of sauce and served with house made ranch |
| WINGS IN BONE - BUFFALO HOT WING SAUCE | ₹450 | `kitchen` | Tossed in your choice of sauce and served with house made ranch |

### 20. BONELESS WINGS (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| BONELESS WINGS - SMOKY BBQ SAUCE | ₹400 | `kitchen` | Tossed in your choice of sauce and served with house made ranch |
| BONELESS WINGS - PERI PERI SAUCE | ₹420 | `kitchen` | Tossed in your choice of sauce and served with house made ranch |
| BONELESS WINGS - BUFFALO HOT WING SAUCE | ₹450 | `kitchen` | Tossed in your choice of sauce and served with house made ranch |

### 21. ALL ABOUT WINGS (`KITCHEN`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| CHANCHAL CHICKEN WINGS | ₹450 | `kitchen` | - |
| TRISHA CHICKEN WINGS | ₹450 | `kitchen` | - |

### 22. CLASSIC COCKTAILS (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| GIMLET | ₹420 | `bar` | GIN,LIME,SUGAR |
| COSMOPOLITAN | ₹420 | `bar` | VODKA,CRANBERRY,TRIPLE SEC,LIME |
| MAI TAI | ₹420 | `bar` | WHITE RUM,DARK RUM,PINEAPPLE,ORANGE,LIME |
| CLASSIC HOT TODY | ₹420 | `bar` | BRANDY,HONEY,INDIAN SPICES |
| BLOODY MARRY | ₹420 | `bar` | VODKA,TOMATO,PAPPER,HERBS |
| MARGARITA | ₹420 | `bar` | TAQUILA,ORANGE LIQUIR,LIME |
| CAIPIROSKA | ₹420 | `bar` | VODKA,MINT,LIME |
| MOJITO | ₹420 | `bar` | WHITE RUM,MINT,LIME |
| WHISKEY SOUR | ₹420 | `bar` | WHISKEY,EGG WHITE,LIME |
| MUD SLIGHT | ₹650 | `bar` | VODKA, BROWNIE,KAHLUA,CHOCOLATE SAUCE,CREAM |
| OLD FASHUONED | ₹420 | `bar` | - |
| WHISKEY HIGHBALL | ₹420 | `bar` | - |
| Black Russian | ₹500 | `bar` | - |
| White Russian | ₹500 | `bar` | - |
| Brave Bull | ₹500 | `bar` | - |

### 23. INVENTED COCKTAILS (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| BARMANS KETTLES | ₹850 | `bar` | ASK FOR FLAOURS |
| BARMANS SECRET | ₹510 | `bar` | ASK OUR BARTENDERS |
| ELIXIER OF TIPSY | ₹460 | `bar` | PINEAPPLE JUICE,WHISKEY,STRAWBERRY,EGGWHITE,LIME |
| BEAUTY LADY | ₹460 | `bar` | VODKA,GRANADINE,ORANGE,LIME |
| SEXY SMILE | ₹460 | `bar` | VODKA,WHISKEY,BEER,CREAM,EGG WHITE,BASIL. |
| CUCCUMBER TWIST | ₹460 | `bar` | GIN,CORIENDER,CUCUMBER,BEER |
| KAFFIR RUM | ₹460 | `bar` | RUM,ORANGE,LIME,KAFFIR LIME |
| DRUNKEN MARGARITA | ₹500 | `bar` | TAQUILA,ORANGE LIQUIR,LIME, RED WINE |
| MELON WIVES | ₹450 | `bar` | WHITE RUM,BASIL,SWEET & SOUR,FRESH WATERMELON |
| CAFÉ -TINI | ₹495 | `bar` | VODKA,KALUHA,COFFEE,VANILLA,BALIES |
| flaming lambourginee | ₹1000 | `bar` | - |
| God Mother | ₹460 | `bar` | - |
| 100 WAYS TO LIE | ₹460 | `bar` | - |
| BANANA DAIQUIRI | ₹460 | `bar` | - |
| PASSENGER PRINCESS | ₹460 | `bar` | - |
| BAHAMA MAMA | ₹460 | `bar` | - |
| THE LAST WORD | ₹460 | `bar` | - |

### 24. BUILT TALL (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| CLASSIC LIIT GLASS | ₹630 | `bar` | Rum, Gin, Vodka, Tequilla, Triple Sec, Lime, Coke. |
| CLASSIC LIIT PITCHER | ₹1760 | `bar` | Rum, Gin, Vodka, Tequilla, Triple Sec, Lime, Coke. |
| GILLIGANS LIIT GLASS | ₹650 | `bar` | Vodka, Rum, Gin, Tequilla, Tripple Sec, Lime, Sugar, Grape Juice. |
| GILLIGANS LIIT PITCHER | ₹1790 | `bar` | Vodka, Rum, Gin, Tequilla, Tripple Sec, Lime, Sugar, Grape Juice. |
| ADIOS MUDDAFUCKER GLASS | ₹650 | `bar` | Vodka, Gin, Rum, Tequilla, Blue Curacao, Lime, 7Up. |
| ADIOS MUDDAFUCKER PITCHER | ₹1790 | `bar` | Vodka, Gin, Rum, Tequilla, Blue Curacao, Lime, 7Up. |
| BLUE FROGG GLASS | ₹700 | `bar` | Vodka, Rum, Gin, Sweet n Sour, Red Bull. |
| BLUE FROGG PITCHER | ₹1920 | `bar` | Vodka, Rum, Gin, Sweet n Sour, Red Bull. |
| SEX WITH SATAN GLASS | ₹650 | `bar` | VODKA, RUM TRIPLE SEC, GIN, BRANDY, CHERRY |
| SEX WITH SATAN PITCHER | ₹1790 | `bar` | VODKA, RUM TRIPLE SEC, GIN, BRANDY, CHERRY |

### 25. SPARKLING COCKTAILS (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| BELLINI | ₹420 | `bar` | - |
| FRENCH 75 | ₹420 | `bar` | - |
| MIMOSA | ₹420 | `bar` | - |
| BROKEN NEGRONI | ₹420 | `bar` | - |

### 26. SANGRIA (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| CLASSIC SANGRIA (RED/WHITE) GLASS | ₹400 | `bar` | - |
| CLASSIC SANGRIA (RED/WHITE) PITCHER | ₹1950 | `bar` | - |
| BASIL APPLE SANGRIA (WHITE) GLASS | ₹400 | `bar` | - |
| BASIL APPLE SANGRIA (WHITE) PITCHER | ₹1950 | `bar` | - |
| ROSEBERRY SANGRIA (RED) GLASS | ₹400 | `bar` | - |
| ROSEBERRY SANGRIA (RED) PITCHER | ₹1950 | `bar` | - |
| WATERMELON SANGRIA (WHITE) GLASS | ₹400 | `bar` | - |
| WATERMELON SANGRIA (WHITE) PITCHER | ₹1950 | `bar` | - |

### 27. DRAUGHT BEER (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| KINGFISHER DRAUGHT GLASS | ₹200 | `bar` | - |
| KINGFISHER DRAUGHT PITCHER | ₹900 | `bar` | - |
| KINGFISHER DRAUGHT TOWER | ₹1600 | `bar` | - |
| KINGFISHER ULTRA DRAUGHT GLASS | ₹250 | `bar` | - |
| KINGFISHER ULTRA DRAUGHT PITCHER | ₹1000 | `bar` | - |
| KINGFISHER ULTRA DRAUGHT TOWER | ₹1900 | `bar` | - |
| KINGFISHER ULTRA MAX DRAUGHT GLASS | ₹300 | `bar` | - |
| KINGFISHER ULTRA MAX DRAUGHT PITCHER | ₹1400 | `bar` | - |
| KINGFISHER ULTRA MAX DRAUGHT TOWER | ₹2700 | `bar` | - |
| HEINEKEN DRAUGHT GLASS | ₹300 | `bar` | - |
| HEINEKEN DRAUGHT PITCHER | ₹1400 | `bar` | - |
| HEINEKEN DRAUGHT TOWER | ₹2700 | `bar` | - |

### 28. SHOTS (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| B 52 | ₹400 | `bar` | - |
| ACID DANCER | ₹420 | `bar` | - |
| KAMAKAZI | ₹250 | `bar` | - |
| GRENADE | ₹700 | `bar` | - |
| CINAMON WHISKEY | ₹400 | `bar` | - |
| JAGER BOMB | ₹600 | `bar` | - |

### 29. PREMIUM WHISKEY (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| Oaksmith Gold 30ML | ₹145 | `bar` | - |
| Oaksmith Gold 180ML | ₹800 | `bar` | - |
| Oaksmith Gold 750ML | ₹3040 | `bar` | - |
| RS BARREL SELECT 30ML | ₹120 | `bar` | - |
| RS BARREL SELECT 180ML | ₹700 | `bar` | - |
| RS BARREL SELECT 750ML | ₹2600 | `bar` | - |
| Blenders Pride 30ML | ₹135 | `bar` | - |
| Blenders Pride 180ML | ₹750 | `bar` | - |
| Blenders Pride 750ML | ₹2850 | `bar` | - |
| Blenders Pride Reserve 30ML | ₹145 | `bar` | - |
| Blenders Pride Reserve 180ML | ₹800 | `bar` | - |
| Blenders Pride Reserve 750ML | ₹3040 | `bar` | - |
| Black & White 30ML | ₹255 | `bar` | - |
| Black & White 180ML | ₹1450 | `bar` | - |
| Black & White 750ML | ₹5510 | `bar` | - |
| Royal Ranthambore 30ML | ₹250 | `bar` | - |
| Royal Ranthambore 180ML | ₹1400 | `bar` | - |
| Royal Ranthambore 750ML | ₹5320 | `bar` | - |
| Vat 69 30ML | ₹240 | `bar` | - |
| Vat 69 180ML | ₹1350 | `bar` | - |
| Vat 69 750ML | ₹5130 | `bar` | - |
| J & B Rare 30ML | ₹210 | `bar` | - |
| J & B Rare 180ML | ₹1150 | `bar` | - |
| J & B Rare 750ML | ₹4370 | `bar` | - |
| Black Dog 30ML | ₹250 | `bar` | - |
| Black Dog 180ML | ₹1400 | `bar` | - |
| Black Dog 750ML | ₹5320 | `bar` | - |
| Dewars White Lable 30ML | ₹215 | `bar` | - |
| Dewars White Lable 180ML | ₹120 | `bar` | - |
| Dewars White Lable 750ML | ₹4560 | `bar` | - |
| Dewars 12 Years 30ML | ₹370 | `bar` | - |
| Dewars 12 Years 180ML | ₹2100 | `bar` | - |
| Dewars 12 Years 750ML | ₹7980 | `bar` | - |
| Teachers Highland Cream 30ML | ₹255 | `bar` | - |
| Teachers Highland Cream 180ML | ₹1425 | `bar` | - |
| Teachers Highland Cream 750ML | ₹5415 | `bar` | - |
| Teachers 50 30ML | ₹300 | `bar` | - |
| Teachers 50 180ML | ₹1690 | `bar` | - |
| Teachers 50 750ML | ₹6422 | `bar` | - |
| 100 Pipers 30ML | ₹240 | `bar` | - |
| 100 Pipers 180ML | ₹1365 | `bar` | - |
| 100 Pipers 750ML | ₹5190 | `bar` | - |
| Willam Lawson 30ML | ₹170 | `bar` | - |
| Willam Lawson 180ML | ₹950 | `bar` | - |
| Willam Lawson 750ML | ₹3605 | `bar` | - |
| Black Dog 8 TRIPLE GOLD 30ML | ₹300 | `bar` | - |
| Black Dog 8 TRIPLE GOLD 180ML | ₹1700 | `bar` | - |
| Black Dog 8 TRIPLE GOLD 750ML | ₹6460 | `bar` | - |
| Oaksmith Silver 30ML | ₹120 | `bar` | - |
| Oaksmith Silver 180ML | ₹700 | `bar` | - |
| Oaksmith Silver 750ML | ₹2600 | `bar` | - |
| ROCKFOLD 30ML | ₹145 | `bar` | - |
| ROCKFOLD 180ML | ₹800 | `bar` | - |
| ROCKFOLD 750ML | ₹3040 | `bar` | - |
| GLENWALK 30ML | ₹160 | `bar` | - |
| GLENWALK 180ML | ₹850 | `bar` | - |
| GLENWALK 750ML | ₹3450 | `bar` | - |
| SIGNATURE PREM 30ML | ₹145 | `bar` | - |
| SIGNATURE PREM 180ML | ₹770 | `bar` | - |
| SIGNATURE PREM 750ML | ₹2700 | `bar` | - |

### 30. IMPORTED WHISKEY (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| Johnnie Walker Red Label 30ML | ₹215 | `bar` | - |
| Johnnie Walker Red Label 180ML | ₹1200 | `bar` | - |
| Johnnie Walker Red Label 750ML | ₹4560 | `bar` | - |
| Johnnie Walker Black Label 30ML | ₹370 | `bar` | - |
| Johnnie Walker Black Label 180ML | ₹2100 | `bar` | - |
| Johnnie Walker Black Label 750ML | ₹7980 | `bar` | - |
| Johnnie Walker Double Black 30ML | ₹475 | `bar` | - |
| Johnnie Walker Double Black 180ML | ₹2700 | `bar` | - |
| Johnnie Walker Double Black 750ML | ₹10260 | `bar` | - |
| Chivas Regal 12 Yo 30ML | ₹370 | `bar` | - |
| Chivas Regal 12 Yo 180ML | ₹2100 | `bar` | - |
| Chivas Regal 12 Yo 750ML | ₹7980 | `bar` | - |
| Ballentine 30ML | ₹215 | `bar` | - |
| Ballentine 180ML | ₹1200 | `bar` | - |
| Ballentine 750ML | ₹4760 | `bar` | - |
| Jim Beam 30ML | ₹275 | `bar` | - |
| Jim Beam 180ML | ₹1545 | `bar` | - |
| Jim Beam 750ML | ₹5875 | `bar` | - |
| Jameson Irish 30ML | ₹290 | `bar` | - |
| Jameson Irish 180ML | ₹1635 | `bar` | - |
| Jameson Irish 750ML | ₹6205 | `bar` | - |
| Jack Daniels 30ML | ₹335 | `bar` | - |
| Jack Daniels 180ML | ₹1900 | `bar` | - |
| Jack Daniels 750ML | ₹7220 | `bar` | - |
| Monkey Shoulder 30ML | ₹440 | `bar` | - |
| Monkey Shoulder 180ML | ₹2495 | `bar` | - |
| Monkey Shoulder 750ML | ₹9485 | `bar` | - |

### 31. SINGLE MALT WHISKEY (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| Indry 30ML | ₹475 | `bar` | - |
| Indry 180ML | ₹2700 | `bar` | - |
| Indry 750ML | ₹10260 | `bar` | - |
| Glenmorangie 10 Yo 30ML | ₹545 | `bar` | - |
| Glenmorangie 10 Yo 180ML | ₹3085 | `bar` | - |
| Glenmorangie 10 Yo 750ML | ₹11715 | `bar` | - |
| Glenlivet 12 Yo 30ML | ₹485 | `bar` | - |
| Glenlivet 12 Yo 180ML | ₹2750 | `bar` | - |
| Glenlivet 12 Yo 750ML | ₹10450 | `bar` | - |
| Glenfiddich 12 Yo 30ML | ₹610 | `bar` | - |
| Glenfiddich 12 Yo 180ML | ₹3450 | `bar` | - |
| Glenfiddich 12 Yo 750ML | ₹13110 | `bar` | - |
| Talisker 10 Yo 30ML | ₹550 | `bar` | - |
| Talisker 10 Yo 180ML | ₹3125 | `bar` | - |
| Talisker 10 Yo 750ML | ₹11875 | `bar` | - |

### 32. VODKA (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| Smirnoff 30ML | ₹145 | `bar` | - |
| Smirnoff 180ML | ₹810 | `bar` | - |
| Smirnoff 750ML | ₹3060 | `bar` | - |
| Smirnoff G Apple/Jamun/Zesty Lime 30ML | ₹170 | `bar` | - |
| Smirnoff G Apple/Jamun/Zesty Lime 180ML | ₹1040 | `bar` | - |
| Smirnoff G Apple/Jamun/Zesty Lime 750ML | ₹4000 | `bar` | - |
| Magic Moment 30ML | ₹145 | `bar` | - |
| Magic Moment 180ML | ₹810 | `bar` | - |
| Magic Moment 750ML | ₹3060 | `bar` | - |
| Magic Moment Jamun/G Apple 30ML | ₹170 | `bar` | - |
| Magic Moment Jamun/G Apple 180ML | ₹1040 | `bar` | - |
| Magic Moment Jamun/G Apple 750ML | ₹4000 | `bar` | - |
| Absolut 30ML | ₹220 | `bar` | - |
| Absolut 180ML | ₹1250 | `bar` | - |
| Absolut 750ML | ₹4750 | `bar` | - |
| Grey Goose 30ML | ₹470 | `bar` | - |
| Grey Goose 180ML | ₹2650 | `bar` | - |
| Grey Goose 750ML | ₹10070 | `bar` | - |
| Ciroc 30ML | ₹430 | `bar` | - |
| Ciroc 180ML | ₹2430 | `bar` | - |
| Ciroc 750ML | ₹9235 | `bar` | - |
| KETAL ONE 30ML | ₹240 | `bar` | - |
| KETAL ONE 180ML | ₹1280 | `bar` | - |
| KETAL ONE 750ML | ₹4850 | `bar` | - |

### 33. GIN (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| Hendricks 30ML | ₹410 | `bar` | - |
| Hendricks 180ML | ₹2350 | `bar` | - |
| Hendricks 750ML | ₹9000 | `bar` | - |
| BEEFEATER 30ML | ₹215 | `bar` | - |
| BEEFEATER 180ML | ₹1200 | `bar` | - |
| BEEFEATER 750ML | ₹4560 | `bar` | - |
| JAISALMER 30ML | ₹310 | `bar` | - |
| JAISALMER 180ML | ₹1780 | `bar` | - |
| JAISALMER 750ML | ₹7000 | `bar` | - |
| Bombay Sapphire 30ML | ₹265 | `bar` | - |
| Bombay Sapphire 180ML | ₹1500 | `bar` | - |
| Bombay Sapphire 750ML | ₹5700 | `bar` | - |
| Greater Than 30ML | ₹155 | `bar` | - |
| Greater Than 180ML | ₹875 | `bar` | - |
| Greater Than 750ML | ₹3325 | `bar` | - |
| BLUE RIBBON 30ML | ₹100 | `bar` | - |
| BLUE RIBBON 180ML | ₹550 | `bar` | - |
| BLUE RIBBON 750ML | ₹2100 | `bar` | - |

### 34. RUM AND BRANDY (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| Old Monk 30ML | ₹100 | `bar` | - |
| Old Monk 180ML | ₹550 | `bar` | - |
| Old Monk 750ML | ₹2100 | `bar` | - |
| Captain Morgon 30ML | ₹100 | `bar` | - |
| Captain Morgon 180ML | ₹550 | `bar` | - |
| Captain Morgon 750ML | ₹2100 | `bar` | - |
| Bacardi White 30ML | ₹150 | `bar` | - |
| Bacardi White 180ML | ₹850 | `bar` | - |
| Bacardi White 750ML | ₹3230 | `bar` | - |
| Bacardi Black 30ML | ₹120 | `bar` | - |
| Bacardi Black 180ML | ₹580 | `bar` | - |
| Bacardi Black 750ML | ₹2400 | `bar` | - |
| Honey Bee 30ML | ₹100 | `bar` | - |
| Honey Bee 180ML | ₹550 | `bar` | - |
| Honey Bee 750ML | ₹2100 | `bar` | - |

### 35. SOFT BEVERAGES (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| RED BULL | ₹250 | `bar` | - |
| GINGER ALE/TONIC WATER | ₹200 | `bar` | - |
| DIET COKE | ₹150 | `bar` | - |
| FRUIT JUICE(PRESERVED) | ₹150 | `bar` | - |
| ICED TEA LEMON/PEACH | ₹200 | `bar` | - |
| FRESH LIME SODA/WATER | ₹130 | `bar` | - |
| SOFT DRINK | ₹70 | `bar` | - |
| SODA | ₹60 | `bar` | - |
| BOTTLED WATER | ₹35 | `bar` | - |

### 36. BEERS & BREEZERS (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| KINGFISHER PREMIUM PINT | ₹240 | `bar` | - |
| KINGFISHER PREMIUM 650ML | ₹430 | `bar` | - |
| KINGFISHER STRONG PINT | ₹280 | `bar` | - |
| KINGFISHER STRONG 650ML | ₹460 | `bar` | - |
| KINGFISHER ULTRA PINT | ₹300 | `bar` | - |
| KINGFISHER ULTRA 650ML | ₹490 | `bar` | - |
| KINGFISHER ULTRA MAX PINT | ₹340 | `bar` | - |
| KINGFISHER ULTRA MAX 650ML | ₹520 | `bar` | - |
| CORONA PINT | ₹400 | `bar` | - |
| HOEGAARDEN PINT | ₹400 | `bar` | - |
| BUDWEISER PINT | ₹330 | `bar` | - |
| BUDWEISER 650ML | ₹495 | `bar` | - |
| BUDWEISER MAGNUM PINT | ₹340 | `bar` | - |
| BUDWEISER MAGNUM 650ML | ₹520 | `bar` | - |
| CARLSBERG ELEPHANT PINT | ₹340 | `bar` | - |
| CARLSBERG ELEPHANT 650ML | ₹495 | `bar` | - |
| CARLSBERG PINT | ₹330 | `bar` | - |
| CARLSBERG 650ML | ₹485 | `bar` | - |
| HEINEKEN SILVER PINT | ₹350 | `bar` | - |
| HEINEKEN SILVER 650ML | ₹530 | `bar` | - |
| TUBORGE PINT | ₹240 | `bar` | - |
| TUBORGE 650ML | ₹420 | `bar` | - |
| BREEZER CRANBERRY BOTTLE | ₹280 | `bar` | - |
| BREEZER CRANBERRY BUCKET OF 5 | ₹1350 | `bar` | - |
| BREEZER JAMAICAN BOTTLE | ₹280 | `bar` | - |
| BREEZER JAMAICAN BUCKET OF 5 | ₹1350 | `bar` | - |
| BREEZER BLUEBERRY BOTTLE | ₹280 | `bar` | - |
| BREEZER BLUEBERRY BUCKET OF 5 | ₹1350 | `bar` | - |
| BREEZER LEMON BOTTLE | ₹280 | `bar` | - |
| BREEZER LEMON BUCKET OF 5 | ₹1350 | `bar` | - |
| BREEZER BLACKBERRY BOTTLE | ₹280 | `bar` | - |
| BREEZER BLACKBERRY BUCKET OF 5 | ₹1350 | `bar` | - |

### 37. WINE (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| RED-Sula Cabernet Shiraz GLASS | ₹445 | `bar` | - |
| RED-Sula Cabernet Shiraz BOTTLE | ₹2100 | `bar` | - |
| RED-Sula Satori GLASS | ₹445 | `bar` | - |
| RED-Sula Satori BOTTLE | ₹2100 | `bar` | - |
| WHITE-Jacobs Creek Chardonnay GLASS | ₹750 | `bar` | - |
| WHITE-Jacobs Creek Chardonnay BOTTLE | ₹3600 | `bar` | - |
| WHITE-Sula Chenin Blanc GLASS | ₹445 | `bar` | - |
| WHITE-Sula Chenin Blanc BOTTLE | ₹2100 | `bar` | - |
| WHITE-Sula Riesling GLASS | ₹445 | `bar` | - |
| WHITE-Sula Riesling BOTTLE | ₹2100 | `bar` | - |
| WHITE-Sula Suavignon Blanc GLASS | ₹445 | `bar` | - |
| WHITE-Sula Suavignon Blanc BOTTLE | ₹2100 | `bar` | - |
| SPARKLING -Chandon Brut GLASS | ₹655 | `bar` | - |
| SPARKLING -Chandon Brut BOTTLE | ₹3100 | `bar` | - |
| RED-Jacobs Creek Shiraz GLASS | ₹750 | `bar` | - |
| RED-Jacobs Creek Shiraz BOTTLE | ₹3600 | `bar` | - |
| RED-Sula Dindori Shiraz GLASS | ₹445 | `bar` | - |
| RED-Sula Dindori Shiraz BOTTLE | ₹2100 | `bar` | - |

### 38. LIQUEURS (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| KAHLUA | ₹380 | `bar` | - |
| SAMBUCA | ₹380 | `bar` | - |
| BAILEYS IRISH CREAM | ₹450 | `bar` | - |
| JAGERMIESTER | ₹495 | `bar` | - |

### 39. TEQUILA (SHOTS) (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| LA CHICA SILVER SHOT | ₹300 | `bar` | - |
| LA CHICA GOLD SHOT | ₹350 | `bar` | - |
| Don Alejenadro SHOT | ₹400 | `bar` | - |

### 40. MOCKTAILS (`BAR`)

| Item Name | Price (₹) | Station | Description |
|---|---|---|---|
| FRESH FOUR FRUITS | ₹350 | `bar` | LIME,MINT,FRESH FRUITS |
| GUAVA MARY | ₹350 | `bar` | GREEN CHILLI,GUAVA, LIME,SALT |
| KIWI KAFFIR LIME TWIST | ₹350 | `bar` | KIWI,KAFFIR LIME,LITCHI |
| RASPBERRY PIE | ₹350 | `bar` | RUSPBERY,LIME,MINT |
| ORANGE BLOSSOM | ₹350 | `bar` | ORANGE,LIME,PINEAPPLE,BASIL |
| SMOOTHIE (WATERMELON,BANANA,KIWI-STRAWBERRYTHREE BERRY) | ₹350 | `bar` | - |

