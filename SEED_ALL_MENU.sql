-- ====================================================================
-- COMPLETE VERIFIED MENU, PRINTERS & TABLES DIRECT DATABASE SEED
-- Cleanly replaces menu, links auth users, ensures printers & tables
-- ====================================================================

-- 0. Drop any existing foreign key constraints on menu_items(category_id)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'menu_items'
          AND kcu.column_name = 'category_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

DO $$
DECLARE
    v_restaurant_id UUID := 'bed0ddd2-4cb9-4a32-9038-4f2f398d0d1a';
    v_cat_id UUID;
BEGIN
    -- 1. Ensure Restaurant exists
    INSERT INTO public.restaurants (id, name, slug)
    VALUES (v_restaurant_id, 'The Tipsy Bar & Eatery', 'the-tipsy-bar-and-eatery')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug;

    -- 2. Link all existing users to this restaurant so they can view the seeded data
    UPDATE public.users
    SET restaurant_id = v_restaurant_id;

    -- 3. Clean up existing order items and menu items for this restaurant
    DELETE FROM public.order_items WHERE menu_item_id IN (
        SELECT id FROM public.menu_items WHERE restaurant_id = v_restaurant_id
    );
    DELETE FROM public.menu_items WHERE restaurant_id = v_restaurant_id;
    DELETE FROM public.menu_categories WHERE restaurant_id = v_restaurant_id;

    -- 4. Insert Categories and Items

    -- Category: VEG-APPETIZERS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'VEG-APPETIZERS', 1)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'STUFF BAKED MUSHROOM', 'stuff-baked-mushroom', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FALAFEL PITA POCKETS', 'falafel-pita-pockets', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FALAFEL WITH HUMMUS', 'falafel-with-hummus', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THECHA COATED GRILLED PANEER', 'thecha-coated-grilled-paneer', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'VEGGIE CROQUETTES', 'veggie-croquettes', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'STIR SAUTED VEGETABLES', 'stir-sauted-vegetables', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUTTER GARLIC VEGITABLE', 'butter-garlic-vegitable', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GHEE ROAST SOYA CHAP', 'ghee-roast-soya-chap', 380, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GANTUR PANEER', 'gantur-paneer', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ASIAN CHILLI MUSHROOM', 'asian-chilli-mushroom', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JOIE', 'joie', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC/GUNTUR PANEER CHILLI', 'classic-guntur-paneer-chilli', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PERI PERI PANEER SKEWARS', 'peri-peri-paneer-skewars', 450, NULL, true, 'kitchen');

    -- Category: NON VEG APPETIZERS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'NON VEG APPETIZERS', 2)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FISH FINGERS AND TATER SAUCE', 'fish-fingers-and-tater-sauce', 580, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ORANGE GLAZE CHICKEN', 'orange-glaze-chicken', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHILLI CHICKEN', 'chilli-chicken', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SRIRACHA PRAWNS', 'sriracha-prawns', 650, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SALT AND PEPPER CHICKEN', 'salt-and-pepper-chicken', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TAWA FISH', 'tawa-fish', 630, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GHEE ROAST PRAWNS', 'ghee-roast-prawns', 650, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GARLIC CHICKEN BAKED BITE BUN', 'garlic-chicken-baked-bite-bun', 500, 'Tuscan garlic-infused chicken, oven-kissed, nestled in a golden, artisanal brioche.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LUDA', 'luda', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BANG BANG CHICKEN', 'bang-bang-chicken', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PATRA FISH', 'patra-fish', 680, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'INDONESIAN CHICKEN SKEWARS', 'indonesian-chicken-skewars', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ONE NIGHT IN PHUKET SPICY SHRIMP', 'one-night-in-phuket-spicy-shrimp', 630, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PERI PERI CHICKEN SKEWARS', 'peri-peri-chicken-skewars', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, '4 YAAR CHICKEN', '4-yaar-chicken', 500, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LAWRENCE TAWA CHICKEN WITH KALA DARU', 'lawrence-tawa-chicken-with-kala-daru', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN IN DA BASKET', 'chicken-in-da-basket', 520, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GUNTUR CHICKEN', 'guntur-chicken', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GOAN KING', 'goan-king', 650, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TIPSY LAMB', 'tipsy-lamb', 700, NULL, true, 'kitchen');

    -- Category: SOUP / FRESH SALAD
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'SOUP / FRESH SALAD', 3)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LEMON CORIANDER HOT BROTH VEG', 'lemon-coriander-hot-broth-veg', 230, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LEMON CORIANDER HOT BROTH NON-VEG', 'lemon-coriander-hot-broth-non-veg', 280, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ALMOND BROCCOLI SOUP VEG', 'almond-broccoli-soup-veg', 260, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ALMOND BROCCOLI SOUP CHICKEN', 'almond-broccoli-soup-chicken', 300, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MANCHOW SOUP VEG', 'manchow-soup-veg', 230, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MANCHOW SOUP CHICKEN', 'manchow-soup-chicken', 280, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CREAM OF TOMATO SOUP', 'cream-of-tomato-soup', 230, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CREAM OF MUSHROOM SOUP', 'cream-of-mushroom-soup', 280, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CREAM OF BROCCOLI SOUP', 'cream-of-broccoli-soup', 280, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'INSALATA CAESAR VEG', 'insalata-caesar-veg', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'INSALATA CAESAR CHICKEN', 'insalata-caesar-chicken', 370, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'INSALATA CAESAR SHRIMP', 'insalata-caesar-shrimp', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'AVOCADO SALAD VEG', 'avocado-salad-veg', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'AVOCADO SALAD CHICKEN', 'avocado-salad-chicken', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'AVOCADO SALAD SHRIMP', 'avocado-salad-shrimp', 440, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MEXICAN SALAD VEG', 'mexican-salad-veg', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MEXICAN SALAD CHICKEN', 'mexican-salad-chicken', 370, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MEXICAN SALAD SHRIMP', 'mexican-salad-shrimp', 440, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GREEK SALAD VEG', 'greek-salad-veg', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GREEK SALAD CHICKEN', 'greek-salad-chicken', 370, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GREEK SALAD SHRIMP', 'greek-salad-shrimp', 440, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'APPLE WALNUT SALAD', 'apple-walnut-salad', 350, NULL, true, 'kitchen');

    -- Category: TANDOOR
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'TANDOOR', 4)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PESHAWARI PANEER TIKKA', 'peshawari-paneer-tikka', 440, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'AFGHANI PANEER TIKKA', 'afghani-paneer-tikka', 440, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BHARWAN KUMBH KEBAB', 'bharwan-kumbh-kebab', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC PANEER TIKKA', 'classic-paneer-tikka', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SOYA CHAP TANDOORI KEBAB', 'soya-chap-tandoori-kebab', 380, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TANDOORI MUSHROOM', 'tandoori-mushroom', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLAY OVEN ROASTED LOLLYPOP', 'clay-oven-roasted-lollypop', 530, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, '8PM CHICKEN', '8pm-chicken', 550, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CILANTRO GARLIC CHICKEN TIKKA', 'cilantro-garlic-chicken-tikka', 500, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LANGDA CHICKEN', 'langda-chicken', 550, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEF’S SPECIAL JWALA MURGH', 'chef’s-special-jwala-murgh', 830, 'Lusious whole chicken marinated in chef’s Maharashtrian GAVRAN style spicy masala & charcoal smoke topped with rum fire.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEFS MATKA CHICKEN', 'chefs-matka-chicken', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SHIKHARI MURG ( EXTRA SPICY )', 'shikhari-murg-extra-spicy', 480, 'Chef special boneless chicken marinated overnight in full spicy shikari masala, not for the fainthearted', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BHATTI DA MURG HALF', 'bhatti-da-murg-half', 500, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BHATTI DA MURG FULL', 'bhatti-da-murg-full', 800, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KAFIR LIME INFUSED KEBAB', 'kafir-lime-infused-kebab', 550, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CAJUN TANDOORI JHINGA', 'cajun-tandoori-jhinga', 630, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THE TIPPSY VEG PLATTER', 'the-tippsy-veg-platter', 1250, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THE TIPPSY NON VEG PLATTER', 'the-tippsy-non-veg-platter', 1580, NULL, true, 'kitchen');

    -- Category: PIZZA & NAANZA
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'PIZZA & NAANZA', 5)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC MARGHERITA PIZZA', 'classic-margherita-pizza', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TANDOORI VEG PIZZA', 'tandoori-veg-pizza', 450, 'Savor a vibrant Tandoori Veg Pizza, a symphony of spiced vegetables and smoky flavors on a crispy crust.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEESY BLAST PIZZA', 'cheesy-blast-pizza', 460, 'Four types of cheese, cheese lovers must try, yummy', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FULL HOUSE EXOTIC PIZZA', 'full-house-exotic-pizza', 460, 'All types of exotic vegetable and mozzarella cheese, cheese sauce', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JAMAICAN PANEER PIZZA', 'jamaican-paneer-pizza', 550, 'Jamican garlic paneer, three bell pepper,olives,cheese', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SPICY PERI PERI COTTAGE CHEESE PIZZA', 'spicy-peri-peri-cottage-cheese-pizza', 550, 'cottage cheese tossed in peri peri spices top on thai chilli , red yellow cup, cheese', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN OVERLOAD CHICKEN PIZZA', 'chicken-overload-chicken-pizza', 600, 'Everything chicken keema, grilled chicken, Jamaican chicken, loaded with cheese', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JAMAICAN GARLIC CHICKEN PIZZA', 'jamaican-garlic-chicken-pizza', 520, 'Succulent jerk chicken, sweet peppers, and creamy garlic sauce on a crispy crust.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN PEPPERONI PIZZA', 'chicken-pepperoni-pizza', 550, 'Savor artisanal chicken pepperoni, premium cheeses, and a crispy crust, a symphony of savory delights.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SEA FOOD PIZZA', 'sea-food-pizza', 680, 'Indulge in a luxurious seafood pizza, a symphony of oceanic flavors atop a perfectly crisp crust', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LASSONI CHICKEN PIZZA', 'lassoni-chicken-pizza', 520, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUTTON ROGAN PIZZA', 'mutton-rogan-pizza', 700, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LAAL MIRCH CHICKEN PIZZA', 'laal-mirch-chicken-pizza', 520, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MEXICAN VEGGIE NAANZA', 'mexican-veggie-naanza', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PANEER MAKHANI NAANZA', 'paneer-makhani-naanza', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KOLHAPURI CHICKEN KHEEMA NAANZA', 'kolhapuri-chicken-kheema-naanza', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MAKHAN CHICKEN NAANZA', 'makhan-chicken-naanza', 450, NULL, true, 'kitchen');

    -- Category: PASTA
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'PASTA', 6)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'VEG CRUST CANNELLONI', 'veg-crust-cannelloni', 480, 'Savory vegetable-stuffed cannelloni, cradled in a golden-baked crust, a symphony of flavors.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEF''S SPECIAL EXOTIC VEG LASAGNE', 'chefs-special-exotic-veg-lasagne', 530, 'Gluten -free Hand made pasta sheet. amazing layers of exotic veg. loaded with cheese baked to perfection on plate', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PENNE PASTA VEG', 'penne-pasta-veg', 400, 'NAPOLITAN /ALFREDO /PINK SAUCE', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PENNE PASTA CHICKEN', 'penne-pasta-chicken', 450, 'NAPOLITAN /ALFREDO /PINK SAUCE', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SPAGHETTI AGLIO OLIO', 'spaghetti-aglio-olio', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SPAGHETTI CREAMY ALFREDO', 'spaghetti-creamy-alfredo', 520, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEF''S SPECIAL CHICKEN BOLOGNESE LASAGNE', 'chefs-special-chicken-bolognese-lasagne', 580, 'Gluten free hand crafted sheets of pasta amazing layers of minced chicken. loaded with cheese', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEF''S SPECIAL CHICKEN BOLOGNESE PENNE', 'chefs-special-chicken-bolognese-penne', 480, 'Gluten free hand crafted sheets of pasta amazing layers of minced chicken. loaded with cheese', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEF''S SPECIAL CHICKEN BOLOGNESE SPAGHETTI', 'chefs-special-chicken-bolognese-spaghetti', 500, 'Gluten free hand crafted sheets of pasta amazing layers of minced chicken. loaded with cheese', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'POLLO PEPPERY MAC & CHEESE', 'pollo-peppery-mac-and-cheese', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PASTA AL PESTO VEG', 'pasta-al-pesto-veg', 480, 'Vibrant, emerald pesto, crafted from fragrant basil and pine nuts, elegantly coats perfectly al dente pasta, a symphony of Mediterranean freshness.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PASTA AL PESTO CHICKEN', 'pasta-al-pesto-chicken', 520, 'Vibrant, emerald pesto, crafted from fragrant basil and pine nuts, elegantly coats perfectly al dente pasta, a symphony of Mediterranean freshness.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KOLHAPURI CHICKEN CANNELLONI', 'kolhapuri-chicken-cannelloni', 580, 'Savory chicken and ricotta, rolled in pasta, baked in a rich tomato sauce, a symphony of Italian flavors.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUTTER CHICKEN CANNELLONI', 'butter-chicken-cannelloni', 580, 'Savory chicken and ricotta, rolled in pasta, baked in a rich tomato sauce, a symphony of Italian flavors.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PASTA BARBARESCA', 'pasta-barbaresca', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN SPAGHETTI AGLIO OLIO', 'chicken-spaghetti-aglio-olio', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN SPAGHETTI CREAMY ALFREDO', 'chicken-spaghetti-creamy-alfredo', 480, NULL, true, 'kitchen');

    -- Category: THE DESI TABLE (MAINS)
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'THE DESI TABLE (MAINS)', 7)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MALABAR GREEN CURRY', 'malabar-green-curry', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'VEG JALFREZZI', 'veg-jalfrezzi', 430, 'All types of vegetable cooked in special spicy yummy gravy', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TIPPSY PANEER KHUMAS', 'tippsy-paneer-khumas', 480, 'Velvety paneer medallions in a rich, aromatic cashew-tomato gravy, adorned with nuts, cream biryani rice-a royal Indian indulgence.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PANEER BUTTER MASALA', 'paneer-butter-masala', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PANEER TIKKA MASALA', 'paneer-tikka-masala', 430, 'Tandoor paneer in a rich, creamy, spiced tomato gravy—a delightful Indian vegetarian curry.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'VEG DEEVANI', 'veg-deevani', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'VILAYATI SABZI', 'vilayati-sabzi', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TAWA SAJI', 'tawa-saji', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEFS SPECIAL MURGH KHUMAS', 'chefs-special-murgh-khumas', 580, 'Chicken keema cooked in Indian gravy half tandoori chicken & biryani rice', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GAVRAN STYLE CHICKEN RASSA', 'gavran-style-chicken-rassa', 480, 'Gavran style chicken masala is a rustic, flavorful Maharashtrian dish featuring tender chicken in a spicy, aromatic gravy.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUTTER CHICKEN', 'butter-chicken', 480, 'Delicious, creamy chicken in a rich tomato gravy, thoda mitha thoda teekha. Perfect with naan!', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN CHETTINAD', 'chicken-chettinad', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUTTON CHETTINAD', 'mutton-chettinad', 680, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUTTON ROGAN JOSH', 'mutton-rogan-josh', 680, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN KALA RASSA', 'chicken-kala-rassa', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUTTON KALA RASSA', 'mutton-kala-rassa', 680, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN RA RA', 'chicken-ra-ra', 500, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUTTON RA RA', 'mutton-ra-ra', 700, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GOAN FISH CURRY', 'goan-fish-curry', 680, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MALVANI FISH CURRY', 'malvani-fish-curry', 680, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MACHAR ZOL', 'machar-zol', 550, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'DAL FRY', 'dal-fry', 300, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'DAL TADKA', 'dal-tadka', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'DAL PALAK', 'dal-palak', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MA KI DAAL', 'ma-ki-daal', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'DESI GHEE DAL KHICHADI', 'desi-ghee-dal-khichadi', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN DAL KHICHADI', 'chicken-dal-khichadi', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUTTON DAL KHICHADI', 'mutton-dal-khichadi', 550, NULL, true, 'kitchen');

    -- Category: THE GLOBAL TABLE (MAINS)
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'THE GLOBAL TABLE (MAINS)', 8)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BURMESE KHOW SUEY VEG', 'burmese-khow-suey-veg', 520, 'Layers of curried coconut noodles, tender protein, and an array of crisp toppings create a symphony of textures and tastes.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BURMESE KHOW SUEY CHICKEN', 'burmese-khow-suey-chicken', 550, 'Layers of curried coconut noodles, tender protein, and an array of crisp toppings create a symphony of textures and tastes.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PAD THAI VEG', 'pad-thai-veg', 520, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PAD THAI SEAFOOD', 'pad-thai-seafood', 650, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GRILLED FISH WITH DEMIGLAZE SAUCE', 'grilled-fish-with-demiglaze-sauce', 520, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN ROULADE', 'chicken-roulade', 500, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HERB CRUSTED CHICKEN', 'herb-crusted-chicken', 490, 'Chicken breast marinated in herbs with mash potato & veggies onside , serve with demi glaze sauce', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CAJUN PRAWNS', 'cajun-prawns', 650, 'Juicy prawns marinated in bold Cajun spices, grilled to perfection, served sizzling hot with zesty dip and smoky herb aroma.', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MINTY THYME LAMB STEAK', 'minty-thyme-lamb-steak', 700, 'Seared lamb steak, infused with fresh mint and thyme, sides with mashed potato & sauted vegetables offering a sophisticated, aromatic, and tender culinary experience.', true, 'kitchen');

    -- Category: CHEF'S SPECIAL - THAI CURRY
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'CHEF''S SPECIAL - THAI CURRY', 9)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THAI CURRY VEGETABLE (RED/GREEN)', 'thai-curry-vegetable-red-green', 520, 'CHEF''S SPECIAL- SMOOTHING COCONUT MILK, THAI CURRY WITH BUTTER HERBS RICE', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THAI CURRY CHICKEN (RED/GREEN)', 'thai-curry-chicken-red-green', 570, 'CHEF''S SPECIAL- SMOOTHING COCONUT MILK, THAI CURRY WITH BUTTER HERBS RICE', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THAI CURRY PRAWN (RED/GREEN)', 'thai-curry-prawn-red-green', 650, 'CHEF''S SPECIAL- SMOOTHING COCONUT MILK, THAI CURRY WITH BUTTER HERBS RICE', true, 'kitchen');

    -- Category: FRIED RICE / NOODLES
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'FRIED RICE / NOODLES', 10)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FRIED RICE / NOODLES VEGETABLE', 'fried-rice-noodles-vegetable', 330, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FRIED RICE / NOODLES CHICKEN', 'fried-rice-noodles-chicken', 380, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FRIED RICE / NOODLES SEAFOOD', 'fried-rice-noodles-seafood', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHILLI GARLIC NOODLES', 'chilli-garlic-noodles', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TRIPLE RICE / NOODLES VEG', 'triple-rice-noodles-veg', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TRIPLE RICE / NOODLES NON-VEG', 'triple-rice-noodles-non-veg', 400, NULL, true, 'kitchen');

    -- Category: BURNT GARLIC RICE / NOODLES
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'BURNT GARLIC RICE / NOODLES', 11)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BURNT GARLIC RICE / NOODLES VEG', 'burnt-garlic-rice-noodles-veg', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BURNT GARLIC RICE / NOODLES CHICKEN', 'burnt-garlic-rice-noodles-chicken', 400, NULL, true, 'kitchen');

    -- Category: SIDE BY SIDE ORDER
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'SIDE BY SIDE ORDER', 12)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ROTI', 'roti', 60, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MAKHAN ROTI', 'makhan-roti', 70, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'NAAN', 'naan', 80, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MAKHAN NAAN', 'makhan-naan', 90, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUTTER GARLIC NAAN', 'butter-garlic-naan', 120, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUTTER CHEESE GARLIC NAAN', 'butter-cheese-garlic-naan', 150, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'STEAMED RICE', 'steamed-rice', 120, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JEERA RICE', 'jeera-rice', 120, NULL, true, 'kitchen');

    -- Category: NACHOS & SOFT SHELL TACOS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'NACHOS & SOFT SHELL TACOS', 13)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CRUST CHEESY NACHOS', 'crust-cheesy-nachos', 380, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'NACHOS WITH SALSA', 'nachos-with-salsa', 330, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GHEE ROST CHICKEN NACHOS', 'ghee-rost-chicken-nachos', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LOADED BEANS NACHOS VEG', 'loaded-beans-nachos-veg', 380, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LOADED BEANS NACHOS CHICKEN', 'loaded-beans-nachos-chicken', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MANHATTAN NACHOS', 'manhattan-nachos', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LOADED BBQ CHICKEN NACHOS', 'loaded-bbq-chicken-nachos', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUTTER CHICKEN TACOS', 'butter-chicken-tacos', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KOLHAPURI CHICKEN TACOS', 'kolhapuri-chicken-tacos', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN STRIPES NACHOS', 'chicken-stripes-nachos', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CFS PRWANS NACHOS', 'cfs-prwans-nachos', 510, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'AFGHANI TACOS VEG', 'afghani-tacos-veg', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'AFGHANI TACOS CHICKEN', 'afghani-tacos-chicken', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HARABHARA TACOS', 'harabhara-tacos', 410, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CAJUN PANEER TACOS', 'cajun-paneer-tacos', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CREAMY VEG TACOS', 'creamy-veg-tacos', 410, NULL, true, 'kitchen');

    -- Category: BIRYANIS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'BIRYANIS', 14)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUGHLAI CHICKEN BIRYANI', 'mughlai-chicken-biryani', 490, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MATKKA CHICKEN DUM BIRYANI', 'matkka-chicken-dum-biryani', 540, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PRAWNS BIRYANI', 'prawns-biryani', 620, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUTTON DUM BIRYANI', 'mutton-dum-biryani', 650, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUGHLAI VEG BIRYANI', 'mughlai-veg-biryani', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MATKA VEG BIRYANI', 'matka-veg-biryani', 460, NULL, true, 'kitchen');

    -- Category: DESSERT
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'DESSERT', 15)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HOT CHOCOLATE SIZZLING BROWNIE WITH ICE CREAM', 'hot-chocolate-sizzling-brownie-with-ice-cream', 310, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PANNA COTTA', 'panna-cotta', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MISSISSIPPI MUD PIE', 'mississippi-mud-pie', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BURNT BASQUE CHEESE CAKE', 'burnt-basque-cheese-cake', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TIRAMISU', 'tiramisu', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MOONG DAL CIGAR ROLL', 'moong-dal-cigar-roll', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TRES LECHES', 'tres-leches', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SHAHI TUKDA', 'shahi-tukda', 300, NULL, true, 'kitchen');

    -- Category: BARBITES
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'BARBITES', 16)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHANA JOR GARAM', 'chana-jor-garam', 120, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MASLEDAR DAANE', 'masledar-daane', 120, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BOILLED CORN CHAT', 'boilled-corn-chat', 120, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'NACHANI PAPAD', 'nachani-papad', 80, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MASALA NACHANI PAPAD', 'masala-nachani-papad', 120, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC MASALA PAPAD', 'classic-masala-papad', 100, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'POTATO STRIPS BOWL', 'potato-strips-bowl', 220, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'POTATO WEDGES SALTED', 'potato-wedges-salted', 220, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'POTATO WEDGES PERI-PERI', 'potato-wedges-peri-peri', 250, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CAJUN CRUMB ONION RINGS', 'cajun-crumb-onion-rings', 260, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BEER BATTERED ONION RINGS', 'beer-battered-onion-rings', 300, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BIRD PEPPER CHILI CORN', 'bird-pepper-chili-corn', 360, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THECHA COATED GRILLED PANEER', 'thecha-coated-grilled-paneer-2', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JALAPEÑO CHEESE BALLS', 'jalapeño-cheese-balls', 390, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN POPCORN', 'chicken-popcorn', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUSHROOM BROCCOLI STIRED FRY', 'mushroom-broccoli-stired-fry', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'NAL STOP ANDA BHURJEE', 'nal-stop-anda-bhurjee', 300, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BOILLED EGG BHURJEE', 'boilled-egg-bhurjee', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KHEEMA PAV', 'kheema-pav', 500, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ASSORTED PAKODA', 'assorted-pakoda', 250, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THE TIPPSY BITES PLATTER ( FOUR SORTS )', 'the-tippsy-bites-platter-four-sorts', 520, NULL, true, 'kitchen');

    -- Category: BURGERS & TOASTS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'BURGERS & TOASTS', 17)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SMASHED BURGER VEG', 'smashed-burger-veg', 360, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SMASHED BURGER CHICKEN', 'smashed-burger-chicken', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC VEG BURGER', 'classic-veg-burger', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'COTTAGE CHEESE PERI PERI BURGER', 'cottage-cheese-peri-peri-burger', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ALOO TIKKI BURGER', 'aloo-tikki-burger', 300, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BEAST BURGER', 'beast-burger', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN BOMBER BURGER', 'chicken-bomber-burger', 420, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'VEGGIE BOMBER BURGER', 'veggie-bomber-burger', 380, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CRISPY FRIED CHICKEN BURGER', 'crispy-fried-chicken-burger', 430, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SPICY GHOST ON TOAST', 'spicy-ghost-on-toast', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'AVOCADO TOAST', 'avocado-toast', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'AVOCADO BRUSCHETTA', 'avocado-bruschetta', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEESE CHILLY TOAST', 'cheese-chilly-toast', 280, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GARLIC COTTAGE CHEESE BAKED BITE BUN', 'garlic-cottage-cheese-baked-bite-bun', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GARLIC CHICKEN BAKED BITE BUN', 'garlic-chicken-baked-bite-bun-2', 500, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN BRUSCHETTA', 'chicken-bruschetta', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUSHROOM BRUSCHETTA', 'mushroom-bruschetta', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHEESY CHICKEN ON TOAST', 'cheesy-chicken-on-toast', 300, NULL, true, 'kitchen');

    -- Category: BAO'S AND DUMPLINGS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'BAO''S AND DUMPLINGS', 18)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHA SU PANEER BAO', 'cha-su-paneer-bao', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ASIAN EXOTIC VEGETABLE BAO', 'asian-exotic-vegetable-bao', 350, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHA SU CHICKEN BAO', 'cha-su-chicken-bao', 400, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ASIAN CHICKEN BAO', 'asian-chicken-bao', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FISH TALE BAO', 'fish-tale-bao', 480, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BEETROOT DUMPLING', 'beetroot-dumpling', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'VEG DUMPLING', 'veg-dumpling', 320, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHICKEN DUMPLING', 'chicken-dumpling', 350, NULL, true, 'kitchen');

    -- Category: WINGS IN BONE
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'WINGS IN BONE', 19)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WINGS IN BONE - SMOKY BBQ SAUCE', 'wings-in-bone-smoky-bbq-sauce', 400, 'Tossed in your choice of sauce and served with house made ranch', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WINGS IN BONE - PERI PERI SAUCE', 'wings-in-bone-peri-peri-sauce', 420, 'Tossed in your choice of sauce and served with house made ranch', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WINGS IN BONE - BUFFALO HOT WING SAUCE', 'wings-in-bone-buffalo-hot-wing-sauce', 450, 'Tossed in your choice of sauce and served with house made ranch', true, 'kitchen');

    -- Category: BONELESS WINGS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'BONELESS WINGS', 20)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BONELESS WINGS - SMOKY BBQ SAUCE', 'boneless-wings-smoky-bbq-sauce', 400, 'Tossed in your choice of sauce and served with house made ranch', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BONELESS WINGS - PERI PERI SAUCE', 'boneless-wings-peri-peri-sauce', 420, 'Tossed in your choice of sauce and served with house made ranch', true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BONELESS WINGS - BUFFALO HOT WING SAUCE', 'boneless-wings-buffalo-hot-wing-sauce', 450, 'Tossed in your choice of sauce and served with house made ranch', true, 'kitchen');

    -- Category: ALL ABOUT WINGS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'ALL ABOUT WINGS', 21)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CHANCHAL CHICKEN WINGS', 'chanchal-chicken-wings', 450, NULL, true, 'kitchen');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TRISHA CHICKEN WINGS', 'trisha-chicken-wings', 450, NULL, true, 'kitchen');

    -- Category: CLASSIC COCKTAILS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'CLASSIC COCKTAILS', 22)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GIMLET', 'gimlet', 420, 'GIN,LIME,SUGAR', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'COSMOPOLITAN', 'cosmopolitan', 420, 'VODKA,CRANBERRY,TRIPLE SEC,LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MAI TAI', 'mai-tai', 420, 'WHITE RUM,DARK RUM,PINEAPPLE,ORANGE,LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC HOT TODY', 'classic-hot-tody', 420, 'BRANDY,HONEY,INDIAN SPICES', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BLOODY MARRY', 'bloody-marry', 420, 'VODKA,TOMATO,PAPPER,HERBS', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MARGARITA', 'margarita', 420, 'TAQUILA,ORANGE LIQUIR,LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CAIPIROSKA', 'caipiroska', 420, 'VODKA,MINT,LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MOJITO', 'mojito', 420, 'WHITE RUM,MINT,LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHISKEY SOUR', 'whiskey-sour', 420, 'WHISKEY,EGG WHITE,LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MUD SLIGHT', 'mud-slight', 650, 'VODKA, BROWNIE,KAHLUA,CHOCOLATE SAUCE,CREAM', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'OLD FASHUONED', 'old-fashuoned', 420, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHISKEY HIGHBALL', 'whiskey-highball', 420, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black Russian', 'black-russian', 500, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'White Russian', 'white-russian', 500, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Brave Bull', 'brave-bull', 500, NULL, true, 'bar');

    -- Category: INVENTED COCKTAILS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'INVENTED COCKTAILS', 23)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BARMANS KETTLES', 'barmans-kettles', 850, 'ASK FOR FLAOURS', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BARMANS SECRET', 'barmans-secret', 510, 'ASK OUR BARTENDERS', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ELIXIER OF TIPSY', 'elixier-of-tipsy', 460, 'PINEAPPLE JUICE,WHISKEY,STRAWBERRY,EGGWHITE,LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BEAUTY LADY', 'beauty-lady', 460, 'VODKA,GRANADINE,ORANGE,LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SEXY SMILE', 'sexy-smile', 460, 'VODKA,WHISKEY,BEER,CREAM,EGG WHITE,BASIL.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CUCCUMBER TWIST', 'cuccumber-twist', 460, 'GIN,CORIENDER,CUCUMBER,BEER', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KAFFIR RUM', 'kaffir-rum', 460, 'RUM,ORANGE,LIME,KAFFIR LIME', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'DRUNKEN MARGARITA', 'drunken-margarita', 500, 'TAQUILA,ORANGE LIQUIR,LIME, RED WINE', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MELON WIVES', 'melon-wives', 450, 'WHITE RUM,BASIL,SWEET & SOUR,FRESH WATERMELON', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CAFÉ -TINI', 'café-tini', 495, 'VODKA,KALUHA,COFFEE,VANILLA,BALIES', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'flaming lambourginee', 'flaming-lambourginee', 1000, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'God Mother', 'god-mother', 460, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, '100 WAYS TO LIE', '100-ways-to-lie', 460, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BANANA DAIQUIRI', 'banana-daiquiri', 460, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'PASSENGER PRINCESS', 'passenger-princess', 460, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BAHAMA MAMA', 'bahama-mama', 460, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'THE LAST WORD', 'the-last-word', 460, NULL, true, 'bar');

    -- Category: BUILT TALL
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'BUILT TALL', 24)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC LIIT GLASS', 'classic-liit-glass', 630, 'Rum, Gin, Vodka, Tequilla, Triple Sec, Lime, Coke.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC LIIT PITCHER', 'classic-liit-pitcher', 1760, 'Rum, Gin, Vodka, Tequilla, Triple Sec, Lime, Coke.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GILLIGANS LIIT GLASS', 'gilligans-liit-glass', 650, 'Vodka, Rum, Gin, Tequilla, Tripple Sec, Lime, Sugar, Grape Juice.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GILLIGANS LIIT PITCHER', 'gilligans-liit-pitcher', 1790, 'Vodka, Rum, Gin, Tequilla, Tripple Sec, Lime, Sugar, Grape Juice.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ADIOS MUDDAFUCKER GLASS', 'adios-muddafucker-glass', 650, 'Vodka, Gin, Rum, Tequilla, Blue Curacao, Lime, 7Up.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ADIOS MUDDAFUCKER PITCHER', 'adios-muddafucker-pitcher', 1790, 'Vodka, Gin, Rum, Tequilla, Blue Curacao, Lime, 7Up.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BLUE FROGG GLASS', 'blue-frogg-glass', 700, 'Vodka, Rum, Gin, Sweet n Sour, Red Bull.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BLUE FROGG PITCHER', 'blue-frogg-pitcher', 1920, 'Vodka, Rum, Gin, Sweet n Sour, Red Bull.', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SEX WITH SATAN GLASS', 'sex-with-satan-glass', 650, 'VODKA, RUM TRIPLE SEC, GIN, BRANDY, CHERRY', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SEX WITH SATAN PITCHER', 'sex-with-satan-pitcher', 1790, 'VODKA, RUM TRIPLE SEC, GIN, BRANDY, CHERRY', true, 'bar');

    -- Category: SPARKLING COCKTAILS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'SPARKLING COCKTAILS', 25)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BELLINI', 'bellini', 420, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FRENCH 75', 'french-75', 420, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'MIMOSA', 'mimosa', 420, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BROKEN NEGRONI', 'broken-negroni', 420, NULL, true, 'bar');

    -- Category: SANGRIA
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'SANGRIA', 26)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC SANGRIA (RED/WHITE) GLASS', 'classic-sangria-red-white-glass', 400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CLASSIC SANGRIA (RED/WHITE) PITCHER', 'classic-sangria-red-white-pitcher', 1950, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BASIL APPLE SANGRIA (WHITE) GLASS', 'basil-apple-sangria-white-glass', 400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BASIL APPLE SANGRIA (WHITE) PITCHER', 'basil-apple-sangria-white-pitcher', 1950, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ROSEBERRY SANGRIA (RED) GLASS', 'roseberry-sangria-red-glass', 400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ROSEBERRY SANGRIA (RED) PITCHER', 'roseberry-sangria-red-pitcher', 1950, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WATERMELON SANGRIA (WHITE) GLASS', 'watermelon-sangria-white-glass', 400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WATERMELON SANGRIA (WHITE) PITCHER', 'watermelon-sangria-white-pitcher', 1950, NULL, true, 'bar');

    -- Category: DRAUGHT BEER
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'DRAUGHT BEER', 27)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER DRAUGHT GLASS', 'kingfisher-draught-glass', 200, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER DRAUGHT PITCHER', 'kingfisher-draught-pitcher', 900, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER DRAUGHT TOWER', 'kingfisher-draught-tower', 1600, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA DRAUGHT GLASS', 'kingfisher-ultra-draught-glass', 250, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA DRAUGHT PITCHER', 'kingfisher-ultra-draught-pitcher', 1000, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA DRAUGHT TOWER', 'kingfisher-ultra-draught-tower', 1900, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA MAX DRAUGHT GLASS', 'kingfisher-ultra-max-draught-glass', 300, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA MAX DRAUGHT PITCHER', 'kingfisher-ultra-max-draught-pitcher', 1400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA MAX DRAUGHT TOWER', 'kingfisher-ultra-max-draught-tower', 2700, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HEINEKEN DRAUGHT GLASS', 'heineken-draught-glass', 300, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HEINEKEN DRAUGHT PITCHER', 'heineken-draught-pitcher', 1400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HEINEKEN DRAUGHT TOWER', 'heineken-draught-tower', 2700, NULL, true, 'bar');

    -- Category: SHOTS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'SHOTS', 28)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'B 52', 'b-52', 400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ACID DANCER', 'acid-dancer', 420, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KAMAKAZI', 'kamakazi', 250, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GRENADE', 'grenade', 700, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CINAMON WHISKEY', 'cinamon-whiskey', 400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JAGER BOMB', 'jager-bomb', 600, NULL, true, 'bar');

    -- Category: PREMIUM WHISKEY
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'PREMIUM WHISKEY', 29)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Oaksmith Gold 30ML', 'oaksmith-gold-30ml', 145, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Oaksmith Gold 180ML', 'oaksmith-gold-180ml', 800, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Oaksmith Gold 750ML', 'oaksmith-gold-750ml', 3040, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RS BARREL SELECT 30ML', 'rs-barrel-select-30ml', 120, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RS BARREL SELECT 180ML', 'rs-barrel-select-180ml', 700, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RS BARREL SELECT 750ML', 'rs-barrel-select-750ml', 2600, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Blenders Pride 30ML', 'blenders-pride-30ml', 135, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Blenders Pride 180ML', 'blenders-pride-180ml', 750, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Blenders Pride 750ML', 'blenders-pride-750ml', 2850, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Blenders Pride Reserve 30ML', 'blenders-pride-reserve-30ml', 145, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Blenders Pride Reserve 180ML', 'blenders-pride-reserve-180ml', 800, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Blenders Pride Reserve 750ML', 'blenders-pride-reserve-750ml', 3040, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black & White 30ML', 'black-and-white-30ml', 255, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black & White 180ML', 'black-and-white-180ml', 1450, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black & White 750ML', 'black-and-white-750ml', 5510, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Royal Ranthambore 30ML', 'royal-ranthambore-30ml', 250, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Royal Ranthambore 180ML', 'royal-ranthambore-180ml', 1400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Royal Ranthambore 750ML', 'royal-ranthambore-750ml', 5320, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Vat 69 30ML', 'vat-69-30ml', 240, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Vat 69 180ML', 'vat-69-180ml', 1350, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Vat 69 750ML', 'vat-69-750ml', 5130, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'J & B Rare 30ML', 'j-and-b-rare-30ml', 210, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'J & B Rare 180ML', 'j-and-b-rare-180ml', 1150, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'J & B Rare 750ML', 'j-and-b-rare-750ml', 4370, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black Dog 30ML', 'black-dog-30ml', 250, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black Dog 180ML', 'black-dog-180ml', 1400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black Dog 750ML', 'black-dog-750ml', 5320, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Dewars White Lable 30ML', 'dewars-white-lable-30ml', 215, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Dewars White Lable 180ML', 'dewars-white-lable-180ml', 120, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Dewars White Lable 750ML', 'dewars-white-lable-750ml', 4560, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Dewars 12 Years 30ML', 'dewars-12-years-30ml', 370, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Dewars 12 Years 180ML', 'dewars-12-years-180ml', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Dewars 12 Years 750ML', 'dewars-12-years-750ml', 7980, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Teachers Highland Cream 30ML', 'teachers-highland-cream-30ml', 255, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Teachers Highland Cream 180ML', 'teachers-highland-cream-180ml', 1425, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Teachers Highland Cream 750ML', 'teachers-highland-cream-750ml', 5415, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Teachers 50 30ML', 'teachers-50-30ml', 300, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Teachers 50 180ML', 'teachers-50-180ml', 1690, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Teachers 50 750ML', 'teachers-50-750ml', 6422, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, '100 Pipers 30ML', '100-pipers-30ml', 240, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, '100 Pipers 180ML', '100-pipers-180ml', 1365, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, '100 Pipers 750ML', '100-pipers-750ml', 5190, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Willam Lawson 30ML', 'willam-lawson-30ml', 170, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Willam Lawson 180ML', 'willam-lawson-180ml', 950, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Willam Lawson 750ML', 'willam-lawson-750ml', 3605, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black Dog 8 TRIPLE GOLD 30ML', 'black-dog-8-triple-gold-30ml', 300, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black Dog 8 TRIPLE GOLD 180ML', 'black-dog-8-triple-gold-180ml', 1700, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Black Dog 8 TRIPLE GOLD 750ML', 'black-dog-8-triple-gold-750ml', 6460, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Oaksmith Silver 30ML', 'oaksmith-silver-30ml', 120, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Oaksmith Silver 180ML', 'oaksmith-silver-180ml', 700, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Oaksmith Silver 750ML', 'oaksmith-silver-750ml', 2600, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ROCKFOLD 30ML', 'rockfold-30ml', 145, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ROCKFOLD 180ML', 'rockfold-180ml', 800, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ROCKFOLD 750ML', 'rockfold-750ml', 3040, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GLENWALK 30ML', 'glenwalk-30ml', 160, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GLENWALK 180ML', 'glenwalk-180ml', 850, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GLENWALK 750ML', 'glenwalk-750ml', 3450, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SIGNATURE PREM 30ML', 'signature-prem-30ml', 145, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SIGNATURE PREM 180ML', 'signature-prem-180ml', 770, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SIGNATURE PREM 750ML', 'signature-prem-750ml', 2700, NULL, true, 'bar');

    -- Category: IMPORTED WHISKEY
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'IMPORTED WHISKEY', 30)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Red Label 30ML', 'johnnie-walker-red-label-30ml', 215, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Red Label 180ML', 'johnnie-walker-red-label-180ml', 1200, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Red Label 750ML', 'johnnie-walker-red-label-750ml', 4560, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Black Label 30ML', 'johnnie-walker-black-label-30ml', 370, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Black Label 180ML', 'johnnie-walker-black-label-180ml', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Black Label 750ML', 'johnnie-walker-black-label-750ml', 7980, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Double Black 30ML', 'johnnie-walker-double-black-30ml', 475, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Double Black 180ML', 'johnnie-walker-double-black-180ml', 2700, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Johnnie Walker Double Black 750ML', 'johnnie-walker-double-black-750ml', 10260, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Chivas Regal 12 Yo 30ML', 'chivas-regal-12-yo-30ml', 370, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Chivas Regal 12 Yo 180ML', 'chivas-regal-12-yo-180ml', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Chivas Regal 12 Yo 750ML', 'chivas-regal-12-yo-750ml', 7980, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Ballentine 30ML', 'ballentine-30ml', 215, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Ballentine 180ML', 'ballentine-180ml', 1200, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Ballentine 750ML', 'ballentine-750ml', 4760, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jim Beam 30ML', 'jim-beam-30ml', 275, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jim Beam 180ML', 'jim-beam-180ml', 1545, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jim Beam 750ML', 'jim-beam-750ml', 5875, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jameson Irish 30ML', 'jameson-irish-30ml', 290, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jameson Irish 180ML', 'jameson-irish-180ml', 1635, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jameson Irish 750ML', 'jameson-irish-750ml', 6205, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jack Daniels 30ML', 'jack-daniels-30ml', 335, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jack Daniels 180ML', 'jack-daniels-180ml', 1900, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Jack Daniels 750ML', 'jack-daniels-750ml', 7220, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Monkey Shoulder 30ML', 'monkey-shoulder-30ml', 440, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Monkey Shoulder 180ML', 'monkey-shoulder-180ml', 2495, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Monkey Shoulder 750ML', 'monkey-shoulder-750ml', 9485, NULL, true, 'bar');

    -- Category: SINGLE MALT WHISKEY
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'SINGLE MALT WHISKEY', 31)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Indry 30ML', 'indry-30ml', 475, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Indry 180ML', 'indry-180ml', 2700, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Indry 750ML', 'indry-750ml', 10260, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenmorangie 10 Yo 30ML', 'glenmorangie-10-yo-30ml', 545, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenmorangie 10 Yo 180ML', 'glenmorangie-10-yo-180ml', 3085, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenmorangie 10 Yo 750ML', 'glenmorangie-10-yo-750ml', 11715, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenlivet 12 Yo 30ML', 'glenlivet-12-yo-30ml', 485, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenlivet 12 Yo 180ML', 'glenlivet-12-yo-180ml', 2750, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenlivet 12 Yo 750ML', 'glenlivet-12-yo-750ml', 10450, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenfiddich 12 Yo 30ML', 'glenfiddich-12-yo-30ml', 610, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenfiddich 12 Yo 180ML', 'glenfiddich-12-yo-180ml', 3450, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Glenfiddich 12 Yo 750ML', 'glenfiddich-12-yo-750ml', 13110, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Talisker 10 Yo 30ML', 'talisker-10-yo-30ml', 550, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Talisker 10 Yo 180ML', 'talisker-10-yo-180ml', 3125, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Talisker 10 Yo 750ML', 'talisker-10-yo-750ml', 11875, NULL, true, 'bar');

    -- Category: VODKA
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'VODKA', 32)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Smirnoff 30ML', 'smirnoff-30ml', 145, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Smirnoff 180ML', 'smirnoff-180ml', 810, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Smirnoff 750ML', 'smirnoff-750ml', 3060, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Smirnoff G Apple/Jamun/Zesty Lime 30ML', 'smirnoff-g-apple-jamun-zesty-lime-30ml', 170, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Smirnoff G Apple/Jamun/Zesty Lime 180ML', 'smirnoff-g-apple-jamun-zesty-lime-180ml', 1040, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Smirnoff G Apple/Jamun/Zesty Lime 750ML', 'smirnoff-g-apple-jamun-zesty-lime-750ml', 4000, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Magic Moment 30ML', 'magic-moment-30ml', 145, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Magic Moment 180ML', 'magic-moment-180ml', 810, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Magic Moment 750ML', 'magic-moment-750ml', 3060, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Magic Moment Jamun/G Apple 30ML', 'magic-moment-jamun-g-apple-30ml', 170, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Magic Moment Jamun/G Apple 180ML', 'magic-moment-jamun-g-apple-180ml', 1040, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Magic Moment Jamun/G Apple 750ML', 'magic-moment-jamun-g-apple-750ml', 4000, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Absolut 30ML', 'absolut-30ml', 220, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Absolut 180ML', 'absolut-180ml', 1250, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Absolut 750ML', 'absolut-750ml', 4750, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Grey Goose 30ML', 'grey-goose-30ml', 470, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Grey Goose 180ML', 'grey-goose-180ml', 2650, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Grey Goose 750ML', 'grey-goose-750ml', 10070, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Ciroc 30ML', 'ciroc-30ml', 430, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Ciroc 180ML', 'ciroc-180ml', 2430, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Ciroc 750ML', 'ciroc-750ml', 9235, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KETAL ONE 30ML', 'ketal-one-30ml', 240, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KETAL ONE 180ML', 'ketal-one-180ml', 1280, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KETAL ONE 750ML', 'ketal-one-750ml', 4850, NULL, true, 'bar');

    -- Category: GIN
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'GIN', 33)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Hendricks 30ML', 'hendricks-30ml', 410, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Hendricks 180ML', 'hendricks-180ml', 2350, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Hendricks 750ML', 'hendricks-750ml', 9000, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BEEFEATER 30ML', 'beefeater-30ml', 215, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BEEFEATER 180ML', 'beefeater-180ml', 1200, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BEEFEATER 750ML', 'beefeater-750ml', 4560, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JAISALMER 30ML', 'jaisalmer-30ml', 310, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JAISALMER 180ML', 'jaisalmer-180ml', 1780, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JAISALMER 750ML', 'jaisalmer-750ml', 7000, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bombay Sapphire 30ML', 'bombay-sapphire-30ml', 265, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bombay Sapphire 180ML', 'bombay-sapphire-180ml', 1500, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bombay Sapphire 750ML', 'bombay-sapphire-750ml', 5700, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Greater Than 30ML', 'greater-than-30ml', 155, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Greater Than 180ML', 'greater-than-180ml', 875, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Greater Than 750ML', 'greater-than-750ml', 3325, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BLUE RIBBON 30ML', 'blue-ribbon-30ml', 100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BLUE RIBBON 180ML', 'blue-ribbon-180ml', 550, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BLUE RIBBON 750ML', 'blue-ribbon-750ml', 2100, NULL, true, 'bar');

    -- Category: RUM AND BRANDY
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'RUM AND BRANDY', 34)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Old Monk 30ML', 'old-monk-30ml', 100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Old Monk 180ML', 'old-monk-180ml', 550, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Old Monk 750ML', 'old-monk-750ml', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Captain Morgon 30ML', 'captain-morgon-30ml', 100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Captain Morgon 180ML', 'captain-morgon-180ml', 550, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Captain Morgon 750ML', 'captain-morgon-750ml', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bacardi White 30ML', 'bacardi-white-30ml', 150, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bacardi White 180ML', 'bacardi-white-180ml', 850, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bacardi White 750ML', 'bacardi-white-750ml', 3230, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bacardi Black 30ML', 'bacardi-black-30ml', 120, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bacardi Black 180ML', 'bacardi-black-180ml', 580, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Bacardi Black 750ML', 'bacardi-black-750ml', 2400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Honey Bee 30ML', 'honey-bee-30ml', 100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Honey Bee 180ML', 'honey-bee-180ml', 550, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Honey Bee 750ML', 'honey-bee-750ml', 2100, NULL, true, 'bar');

    -- Category: SOFT BEVERAGES
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'SOFT BEVERAGES', 35)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED BULL', 'red-bull', 250, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GINGER ALE/TONIC WATER', 'ginger-ale-tonic-water', 200, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'DIET COKE', 'diet-coke', 150, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FRUIT JUICE(PRESERVED)', 'fruit-juicepreserved', 150, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ICED TEA LEMON/PEACH', 'iced-tea-lemon-peach', 200, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FRESH LIME SODA/WATER', 'fresh-lime-soda-water', 130, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SOFT DRINK', 'soft-drink', 70, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SODA', 'soda', 60, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BOTTLED WATER', 'bottled-water', 35, NULL, true, 'bar');

    -- Category: BEERS & BREEZERS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'BEERS & BREEZERS', 36)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER PREMIUM PINT', 'kingfisher-premium-pint', 240, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER PREMIUM 650ML', 'kingfisher-premium-650ml', 430, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER STRONG PINT', 'kingfisher-strong-pint', 280, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER STRONG 650ML', 'kingfisher-strong-650ml', 460, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA PINT', 'kingfisher-ultra-pint', 300, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA 650ML', 'kingfisher-ultra-650ml', 490, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA MAX PINT', 'kingfisher-ultra-max-pint', 340, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KINGFISHER ULTRA MAX 650ML', 'kingfisher-ultra-max-650ml', 520, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CORONA PINT', 'corona-pint', 400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HOEGAARDEN PINT', 'hoegaarden-pint', 400, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUDWEISER PINT', 'budweiser-pint', 330, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUDWEISER 650ML', 'budweiser-650ml', 495, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUDWEISER MAGNUM PINT', 'budweiser-magnum-pint', 340, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BUDWEISER MAGNUM 650ML', 'budweiser-magnum-650ml', 520, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CARLSBERG ELEPHANT PINT', 'carlsberg-elephant-pint', 340, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CARLSBERG ELEPHANT 650ML', 'carlsberg-elephant-650ml', 495, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CARLSBERG PINT', 'carlsberg-pint', 330, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'CARLSBERG 650ML', 'carlsberg-650ml', 485, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HEINEKEN SILVER PINT', 'heineken-silver-pint', 350, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'HEINEKEN SILVER 650ML', 'heineken-silver-650ml', 530, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TUBORGE PINT', 'tuborge-pint', 240, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'TUBORGE 650ML', 'tuborge-650ml', 420, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER CRANBERRY BOTTLE', 'breezer-cranberry-bottle', 280, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER CRANBERRY BUCKET OF 5', 'breezer-cranberry-bucket-of-5', 1350, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER JAMAICAN BOTTLE', 'breezer-jamaican-bottle', 280, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER JAMAICAN BUCKET OF 5', 'breezer-jamaican-bucket-of-5', 1350, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER BLUEBERRY BOTTLE', 'breezer-blueberry-bottle', 280, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER BLUEBERRY BUCKET OF 5', 'breezer-blueberry-bucket-of-5', 1350, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER LEMON BOTTLE', 'breezer-lemon-bottle', 280, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER LEMON BUCKET OF 5', 'breezer-lemon-bucket-of-5', 1350, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER BLACKBERRY BOTTLE', 'breezer-blackberry-bottle', 280, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BREEZER BLACKBERRY BUCKET OF 5', 'breezer-blackberry-bucket-of-5', 1350, NULL, true, 'bar');

    -- Category: WINE
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'WINE', 37)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED-Sula Cabernet Shiraz GLASS', 'red-sula-cabernet-shiraz-glass', 445, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED-Sula Cabernet Shiraz BOTTLE', 'red-sula-cabernet-shiraz-bottle', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED-Sula Satori GLASS', 'red-sula-satori-glass', 445, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED-Sula Satori BOTTLE', 'red-sula-satori-bottle', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHITE-Jacobs Creek Chardonnay GLASS', 'white-jacobs-creek-chardonnay-glass', 750, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHITE-Jacobs Creek Chardonnay BOTTLE', 'white-jacobs-creek-chardonnay-bottle', 3600, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHITE-Sula Chenin Blanc GLASS', 'white-sula-chenin-blanc-glass', 445, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHITE-Sula Chenin Blanc BOTTLE', 'white-sula-chenin-blanc-bottle', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHITE-Sula Riesling GLASS', 'white-sula-riesling-glass', 445, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHITE-Sula Riesling BOTTLE', 'white-sula-riesling-bottle', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHITE-Sula Suavignon Blanc GLASS', 'white-sula-suavignon-blanc-glass', 445, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'WHITE-Sula Suavignon Blanc BOTTLE', 'white-sula-suavignon-blanc-bottle', 2100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SPARKLING -Chandon Brut GLASS', 'sparkling-chandon-brut-glass', 655, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SPARKLING -Chandon Brut BOTTLE', 'sparkling-chandon-brut-bottle', 3100, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED-Jacobs Creek Shiraz GLASS', 'red-jacobs-creek-shiraz-glass', 750, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED-Jacobs Creek Shiraz BOTTLE', 'red-jacobs-creek-shiraz-bottle', 3600, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED-Sula Dindori Shiraz GLASS', 'red-sula-dindori-shiraz-glass', 445, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RED-Sula Dindori Shiraz BOTTLE', 'red-sula-dindori-shiraz-bottle', 2100, NULL, true, 'bar');

    -- Category: LIQUEURS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'LIQUEURS', 38)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KAHLUA', 'kahlua', 380, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SAMBUCA', 'sambuca', 380, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'BAILEYS IRISH CREAM', 'baileys-irish-cream', 450, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'JAGERMIESTER', 'jagermiester', 495, NULL, true, 'bar');

    -- Category: TEQUILA (SHOTS)
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'TEQUILA (SHOTS)', 39)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LA CHICA SILVER SHOT', 'la-chica-silver-shot', 300, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'LA CHICA GOLD SHOT', 'la-chica-gold-shot', 350, NULL, true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'Don Alejenadro SHOT', 'don-alejenadro-shot', 400, NULL, true, 'bar');

    -- Category: MOCKTAILS
    INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
    VALUES (v_restaurant_id, 'MOCKTAILS', 40)
    RETURNING id INTO v_cat_id;

    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'FRESH FOUR FRUITS', 'fresh-four-fruits', 350, 'LIME,MINT,FRESH FRUITS', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'GUAVA MARY', 'guava-mary', 350, 'GREEN CHILLI,GUAVA, LIME,SALT', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'KIWI KAFFIR LIME TWIST', 'kiwi-kaffir-lime-twist', 350, 'KIWI,KAFFIR LIME,LITCHI', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'RASPBERRY PIE', 'raspberry-pie', 350, 'RUSPBERY,LIME,MINT', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'ORANGE BLOSSOM', 'orange-blossom', 350, 'ORANGE,LIME,PINEAPPLE,BASIL', true, 'bar');
    INSERT INTO public.menu_items (restaurant_id, category_id, name, slug, price, description, is_available, printer_type)
    VALUES (v_restaurant_id, v_cat_id, 'SMOOTHIE (WATERMELON,BANANA,KIWI-STRAWBERRYTHREE BERRY)', 'smoothie-watermelonbananakiwi-strawberrythree-berry', 350, NULL, true, 'bar');

    -- 4. Ensure 3 Real Hardware Printers exist (preserve UUIDs to keep print-server cache permanent)
    IF NOT EXISTS (SELECT 1 FROM public.printers WHERE restaurant_id = v_restaurant_id AND type = 'kitchen') THEN
        INSERT INTO public.printers (restaurant_id, name, ip_address, port, type, is_active, connection_status)
        VALUES (v_restaurant_id, 'Kitchen One', '192.168.1.95', 9100, 'kitchen', true, 'online');
    ELSE
        UPDATE public.printers 
        SET ip_address = '192.168.1.95', port = 9100, is_active = true
        WHERE restaurant_id = v_restaurant_id AND type = 'kitchen';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.printers WHERE restaurant_id = v_restaurant_id AND type = 'billing') THEN
        INSERT INTO public.printers (restaurant_id, name, ip_address, port, type, is_active, connection_status)
        VALUES (v_restaurant_id, 'Counter One', E'\\\\DESKTOP-VJVJQ4E\\rp3160', 9100, 'billing', true, 'online');
    ELSE
        UPDATE public.printers 
        SET ip_address = E'\\\\DESKTOP-VJVJQ4E\\rp3160', port = 9100, is_active = true
        WHERE restaurant_id = v_restaurant_id AND type = 'billing';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.printers WHERE restaurant_id = v_restaurant_id AND type = 'bar') THEN
        INSERT INTO public.printers (restaurant_id, name, ip_address, port, type, is_active, connection_status)
        VALUES (v_restaurant_id, 'Bar One', E'\\\\DESKTOP-VJVJQ4E\\barip195', 9100, 'bar', true, 'online');
    ELSE
        UPDATE public.printers 
        SET ip_address = E'\\\\DESKTOP-VJVJQ4E\\barip195', port = 9100, is_active = true
        WHERE restaurant_id = v_restaurant_id AND type = 'bar';
    END IF;

    -- 5. Ensure 12 Standard Tables exist
    FOR i IN 1..12 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.tables WHERE restaurant_id = v_restaurant_id AND number = i) THEN
            INSERT INTO public.tables (restaurant_id, number, capacity, status)
            VALUES (v_restaurant_id, i, CASE WHEN i % 4 = 1 THEN 2 WHEN i % 4 = 2 THEN 4 WHEN i % 4 = 3 THEN 6 ELSE 8 END, 'available');
        END IF;
    END LOOP;

END $$;

-- 6. Clean up any orphaned menu items or order items across the whole database
-- that reference categories that do not exist in menu_categories (guarantees FK re-attachment succeeds)
DELETE FROM public.order_items WHERE menu_item_id IN (
    SELECT id FROM public.menu_items WHERE category_id NOT IN (SELECT id FROM public.menu_categories)
);
DELETE FROM public.menu_items WHERE category_id NOT IN (SELECT id FROM public.menu_categories);

-- 7. Re-attach FK constraint pointing to the CORRECT table (menu_categories)
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.menu_categories(id)
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

