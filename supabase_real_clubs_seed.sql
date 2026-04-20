with club_seed (
  slug,
  short_code,
  name,
  city,
  country,
  age_band,
  coach_name,
  players_count,
  summary,
  is_public,
  is_active
) as (
  values
    ('dinamo-tbilisi', 'DT', 'დინამო თბილისი', 'თბილისი (დიღომი)', 'Georgia', 'PRO', null, 132, 'ელიტური აკადემია სრული ციკლით U6-U17. ყველაზე მასშტაბური სისტემა და ქვეყნის ერთ-ერთი მთავარი ბირთვი.', true, true),
    ('iberia-1999', 'IB', 'იბერია 1999', 'თბილისი', 'Georgia', 'PRO', null, 118, 'ელიტური აკადემია სრული აკადემიური ციკლით. ძლიერი ახალგაზრდული და განვითარების სტრუქტურა.', true, true),
    ('lokomotivi-tbilisi', 'LT', 'ლოკომოტივი თბილისი', 'თბილისი (საგურამო)', 'Georgia', 'PRO', null, 110, 'ელიტური აკადემია ძლიერი ახალგაზრდული სექტორით და სრული განვითარებითი ციკლით.', true, true),
    ('gagra-tbilisi', 'GG', 'გაგრა', 'თბილისი', 'Georgia', 'PRO', null, 104, 'ელიტური კლუბი აქტიური მონაწილეობით ყველა ასაკობრივ ლიგაში.', true, true),
    ('wit-georgia', 'WG', 'ვიტ ჯორჯია', 'თბილისი (მცხეთა)', 'Georgia', 'PRO', null, 98, 'ტრადიციული აკადემია სრული საფეხბურთო ციკლით და მრავალწლიანი გამოცდილებით.', true, true),
    ('dinamo-batumi', 'DB', 'დინამო ბათუმი', 'ბათუმი', 'Georgia', 'PRO', null, 126, 'აჭარის რეგიონის მთავარი საფეხბურთო ჰაბი სრული აკადემიური სტრუქტურით.', true, true),
    ('torpedo-kutaisi', 'TK', 'ტორპედო ქუთაისი', 'ქუთაისი', 'Georgia', 'PRO', null, 121, 'იმერეთის მთავარი საფეხბურთო ცენტრი სრული აკადემიური ინფრასტრუქტურით.', true, true),
    ('dila-gori', 'DG', 'დილა გორი', 'გორი', 'Georgia', 'PRO', null, 102, 'შიდა ქართლის მთავარი საფეხბურთო ცენტრი სრული ახალგაზრდული ციკლით.', true, true),
    ('rustavi', 'RU', 'რუსთავი', 'რუსთავი', 'Georgia', 'PRO', null, 95, 'ქვემო ქართლის რეგიონული ცენტრი და სრული ასაკობრივი სტრუქტურის მქონე აკადემია.', true, true),

    ('avaza', 'AV', 'ავაზა', 'თბილისი', 'Georgia', 'U13', null, 54, 'თბილისის ზონის რეგიონალური საფეხბურთო სკოლა, აქტიური მასობრივ ფეხბურთში U6-U13 ასაკებში.', true, true),
    ('nortsi-dinamoeli', 'ND', 'ნორჩი დინამოელი', 'თბილისი', 'Georgia', 'U13', null, 58, 'თბილისის ზონის მასობრივი ფეხბურთის სკოლა, ორიენტირებული საბაზისო ტექნიკურ განვითარებაზე.', true, true),
    ('olimpi', 'OL', 'ოლიმპი', 'თბილისი', 'Georgia', 'U13', null, 52, 'კერძო საფეხბურთო სკოლა თბილისის ზონაში, ძირითადად U6-U13 ასაკობრივ კატეგორიებში.', true, true),
    ('tbilisi-academy', 'TB', 'თბილისი', 'თბილისი', 'Georgia', 'U13', null, 49, 'თბილისის მასობრივი ფეხბურთის პროგრამაში მონაწილე საფეხბურთო სკოლა.', true, true),
    ('merani-school', 'MR', 'მერანი', 'თბილისი', 'Georgia', 'U13', null, 46, 'თბილისის ზონის საფეხბურთო სკოლა, ორიენტირებული საბავშვო და მოსამზადებელ საფეხურებზე.', true, true),
    ('school-35', 'S35', '35-ე სკოლა', 'თბილისი', 'Georgia', 'U13', null, 38, 'სასკოლო საფეხბურთო პროგრამა მასობრივ ფეხბურთში აქტიური მონაწილეობით.', true, true),
    ('imedi', 'IM', 'იმედი', 'თბილისი', 'Georgia', 'U13', null, 41, 'თბილისის ზონის კერძო საფეხბურთო სკოლა საწყისი და საშუალო ასაკებისთვის.', true, true),

    ('martve-kutaisi', 'MV', 'მარტვე', 'ქუთაისი', 'Georgia', 'U13', null, 44, 'დასავლეთ საქართველოს რეგიონალური საფეხბურთო პროექტი, ქუთაისის ზონაში აქტიური მონაწილეობით.', true, true),
    ('chikhura-sachkhere', 'CH', 'ჩიხურა', 'საჩხერე', 'Georgia', 'U13', null, 47, 'საჩხერის რეგიონული სკოლა, დასავლეთ საქართველოს ახალგაზრდულ კონკურენციაში აქტიური მონაწილე.', true, true),
    ('samtredia', 'ST', 'სამტრედია', 'სამტრედია', 'Georgia', 'U13', null, 51, 'იმერეთის რეგიონის მასობრივი ფეხბურთის მნიშვნელოვანი ცენტრი.', true, true),
    ('zugdidi', 'ZG', 'ზუგდიდი', 'ზუგდიდი', 'Georgia', 'U13', null, 45, 'სამეგრელოს რეგიონული საფეხბურთო სკოლა აქტიური საბავშვო პროგრამებით.', true, true),
    ('kolkheti-poti', 'KP', 'ფოთის კოლხეთი', 'ფოთი', 'Georgia', 'U13', null, 48, 'ფოთის რეგიონული კლუბი და მასობრივი ფეხბურთის აქტიური მონაწილე დასავლეთ საქართველოში.', true, true),
    ('mertskhali-ozurgeti', 'MO', 'ოზურგეთის მერცხალი', 'ოზურგეთი', 'Georgia', 'U13', null, 43, 'გურიის რეგიონის საფეხბურთო სკოლა საბავშვო და მოსამზადებელი ასაკებისთვის.', true, true),

    ('mwvane-kontskhi', 'MK', 'მწვანე კონცხი', 'ბათუმი', 'Georgia', 'U13', null, 42, 'აჭარის რეგიონული საფეხბურთო ცენტრი, აქტიური მონაწილეობით საბავშვო ლიგებში.', true, true),
    ('khulo', 'KH', 'ხულო', 'ხულო', 'Georgia', 'U13', null, 31, 'მთიანი აჭარის რეგიონალური საფეხბურთო პროგრამა ადგილობრივი ტალანტების განვითარებისთვის.', true, true),
    ('shukura-kobuleti', 'SK', 'შუქურა ქობულეთი', 'ქობულეთი', 'Georgia', 'U13', null, 53, 'ქობულეთის რეგიონული ცენტრი და აჭარის ერთ-ერთი ყველაზე აქტიური საფეხბურთო სკოლა.', true, true),

    ('argo-marneuli', 'MA', 'მარნეულის არგო', 'მარნეული', 'Georgia', 'U13', null, 37, 'ქვემო ქართლის რეგიონული საფეხბურთო სკოლა ადგილობრივი ბავშვებისა და მოზარდებისთვის.', true, true),
    ('telavi-academy', 'TA', 'თელავის აკადემია', 'თელავი', 'Georgia', 'U13', null, 40, 'კახეთის რეგიონული აკადემია მასობრივი ფეხბურთის პროგრამებით.', true, true),
    ('kaspi-teams', 'KG', 'კასპის გუნდები', 'კასპი', 'Georgia', 'U13', null, 29, 'კასპის რეგიონული საფეხბურთო ჯგუფები და მოსამზადებელი გუნდები.', true, true)
),
prepared as (
  select
    slug,
    short_code,
    name,
    city,
    country,
    age_band,
    coach_name,
    players_count,
    null::citext as contact_email,
    null::text as phone,
    'data:image/svg+xml;base64,' ||
      encode(
        convert_to(
          format(
            '<svg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 96 112''><defs><linearGradient id=''g'' x1=''0'' y1=''0'' x2=''1'' y2=''1''><stop offset=''0'' stop-color=''%s''/><stop offset=''1'' stop-color=''%s''/></linearGradient></defs><path d=''M48 4L84 16V48C84 69 69 88 48 104C27 88 12 69 12 48V16L48 4Z'' fill=''url(#g)''/><path d=''M48 14L74 23V48C74 63 64 77 48 89C32 77 22 63 22 48V23L48 14Z'' fill=''none'' stroke=''white'' stroke-opacity=''.68'' stroke-width=''2''/><circle cx=''48'' cy=''40'' r=''14'' fill=''%s'' fill-opacity=''.96''/><text x=''48'' y=''45'' text-anchor=''middle'' font-family=''Segoe UI, Arial, sans-serif'' font-size=''17'' font-weight=''900'' fill=''white''>%s</text><text x=''48'' y=''74'' text-anchor=''middle'' font-family=''Segoe UI, Arial, sans-serif'' font-size=''9'' font-weight=''800'' letter-spacing=''.18em'' fill=''white''>CLUB</text></svg>',
            case mod(abs(hashtext(slug)), 6)
              when 0 then '#b91c1c'
              when 1 then '#1d4ed8'
              when 2 then '#0f766e'
              when 3 then '#7c3aed'
              when 4 then '#ea580c'
              else '#1f2937'
            end,
            case mod(abs(hashtext(slug)), 6)
              when 0 then '#7f1d1d'
              when 1 then '#1e3a8a'
              when 2 then '#134e4a'
              when 3 then '#4c1d95'
              when 4 then '#9a3412'
              else '#0f172a'
            end,
            case mod(abs(hashtext(slug)), 6)
              when 0 then '#fca5a5'
              when 1 then '#93c5fd'
              when 2 then '#99f6e4'
              when 3 then '#c4b5fd'
              when 4 then '#fdba74'
              else '#cbd5e1'
            end,
            short_code
          ),
          'UTF8'
        ),
        'base64'
      ) as logo_path,
    summary,
    is_public,
    is_active
  from club_seed
)
insert into public.clubs (
  slug,
  short_code,
  name,
  city,
  country,
  age_band,
  coach_name,
  players_count,
  contact_email,
  phone,
  logo_path,
  summary,
  is_public,
  is_active
)
select
  slug,
  short_code,
  name,
  city,
  country,
  age_band,
  coach_name,
  players_count,
  contact_email,
  phone,
  logo_path,
  summary,
  is_public,
  is_active
from prepared
on conflict (slug) do update
set
  short_code = excluded.short_code,
  name = excluded.name,
  city = excluded.city,
  country = excluded.country,
  age_band = excluded.age_band,
  coach_name = excluded.coach_name,
  players_count = excluded.players_count,
  contact_email = excluded.contact_email,
  phone = excluded.phone,
  logo_path = excluded.logo_path,
  summary = excluded.summary,
  is_public = excluded.is_public,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());
