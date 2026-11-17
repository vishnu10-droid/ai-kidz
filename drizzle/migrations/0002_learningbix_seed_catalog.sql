
insert into public.course_categories (name, slug, description, position) values
 ('Robotics', 'robotics', 'Build robots, circuits and intelligent machines.', 1),
 ('Coding', 'coding', 'Programming skills through fun, interactive projects.', 2),
 ('Pre-School', 'preschool', 'Early learning through creativity and exploration.', 3),
 ('STEM Education', 'stem', 'Science, technology, engineering and maths by doing.', 4),
 ('AI & Machine Learning', 'artificial-intelligence', 'Teach machines to see, hear and decide.', 5);

insert into public.courses (category_id, slug, title, short_description, description, image_url, age_group, duration, level, price)
select c.id, v.slug, v.title, v.short, v.short || ' Students learn through guided builds, weekly challenges and a final showcase project.', v.img, v.age, v.dur, v.lvl, v.price
from (values
 ('robotics','beginner-robotics','Robotics for Beginners','Build your first moving robot with motors, wheels and simple logic.','/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg','6-9 yrs','8 weeks','Beginner',4999),
 ('robotics','intermediate-robotics','Intermediate Robotics','Program sensors and make robots react to light, sound and obstacles.','/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg','9-12 yrs','10 weeks','Intermediate',6999),
 ('robotics','advanced-robotics','Advanced Robotics','Design autonomous robots with microcontrollers and multi-sensor logic.','/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg','12-16 yrs','12 weeks','Advanced',8999),
 ('robotics','electronics-basics','Electronics','Circuits, LEDs, resistors and breadboards explained through mini builds.','/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg','8-12 yrs','6 weeks','Beginner',3999),
 ('robotics','sensors-and-motors','Sensors and Motors','Servo, DC and stepper motors plus ultrasonic, IR and touch sensors.','/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg','10-14 yrs','8 weeks','Intermediate',5499),
 ('robotics','iot-and-electronics','IoT and Electronics','Connect devices to the internet and build a smart home model.','/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg','11-16 yrs','10 weeks','Intermediate',6999),
 ('robotics','automation','Automation','Conveyor belts, sorting machines and automatic doors with code.','/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg','12-16 yrs','8 weeks','Advanced',6499),
 ('coding','scratch-coding','Scratch Coding','Create animations, stories and games with drag-and-drop blocks.','/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg','6-10 yrs','8 weeks','Beginner',3999),
 ('coding','block-based-coding','Block-Based Coding','Sequences, loops and conditions with visual coding puzzles.','/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg','5-8 yrs','6 weeks','Beginner',2999),
 ('coding','python-programming','Python Programming','Real-world Python: variables, functions, games and data projects.','/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg','10-16 yrs','12 weeks','Intermediate',6999),
 ('coding','cpp-programming','C++ Programming','Problem-solving with C++ and Arduino-style hardware programming.','/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg','12-16 yrs','12 weeks','Advanced',7499),
 ('coding','web-development-basics','Web Development Basics','Build and publish your own website with HTML, CSS and JavaScript.','/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg','11-16 yrs','10 weeks','Intermediate',5999),
 ('coding','game-development','Game Development','Design levels, characters and scoring systems for your own game.','/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg','9-14 yrs','10 weeks','Intermediate',5999),
 ('artificial-intelligence','artificial-intelligence','Artificial Intelligence','A friendly first course in how AI thinks, learns and decides.','/__l5e/assets-v1/0a9a877e-4eab-4dcf-ae4c-ded28a7db590/program-ai.jpg','10-16 yrs','8 weeks','Beginner',5999),
 ('artificial-intelligence','machine-learning-basics','Machine Learning Basics','Train models to classify images and sounds without heavy maths.','/__l5e/assets-v1/0a9a877e-4eab-4dcf-ae4c-ded28a7db590/program-ai.jpg','12-16 yrs','10 weeks','Intermediate',6999),
 ('artificial-intelligence','computer-vision','Computer Vision','Face detection, colour tracking and object recognition with a webcam.','/__l5e/assets-v1/0a9a877e-4eab-4dcf-ae4c-ded28a7db590/program-ai.jpg','12-16 yrs','10 weeks','Advanced',7999),
 ('artificial-intelligence','ai-projects','AI Projects','Capstone projects: voice assistant, smart camera and chatbot.','/__l5e/assets-v1/0a9a877e-4eab-4dcf-ae4c-ded28a7db590/program-ai.jpg','13-16 yrs','8 weeks','Advanced',7499),
 ('preschool','little-innovators','Little Innovators','Shapes, gears, colours and stories that spark early curiosity.','/__l5e/assets-v1/019ed067-d54a-491d-96e4-ae33452ad482/program-preschool.jpg','3-5 yrs','12 weeks','Beginner',2999),
 ('preschool','tiny-engineers','Tiny Engineers','Build-and-play activities that grow fine motor and logic skills.','/__l5e/assets-v1/019ed067-d54a-491d-96e4-ae33452ad482/program-preschool.jpg','4-6 yrs','10 weeks','Beginner',2999),
 ('stem','stem-explorers','STEM Explorers','Hands-on experiments in physics, chemistry and engineering.','/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg','7-12 yrs','10 weeks','Beginner',4499),
 ('stem','young-scientists','Young Scientists','Ask questions, test ideas and record results like a real scientist.','/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg','8-13 yrs','8 weeks','Intermediate',4499)
) as v(cat, slug, title, short, img, age, dur, lvl, price)
join public.course_categories c on c.slug = v.cat;

-- Three modules per course
insert into public.course_modules (course_id, title, position)
select c.id, m.title, m.pos from public.courses c
cross join (values ('Getting Started', 1), ('Core Concepts', 2), ('Build Your Project', 3)) as m(title, pos);

-- Three lessons per module (sample videos and PDF until real lesson media is uploaded)
insert into public.lessons (module_id, title, content, video_url, pdf_url, duration_minutes, position)
select m.id,
  case m.position
    when 1 then (array['Welcome & safety basics','Meet your tools','Your first mini challenge'])[l.n]
    when 2 then (array['Key ideas explained','Guided practice','Debugging & improving'])[l.n]
    else (array['Plan your project','Build and test','Showcase & reflect'])[l.n]
  end,
  'In this lesson of ' || c.title || ' you will follow the video, try the activity on your own and note down what you discovered.',
  (array['https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'])[l.n],
  case when l.n = 2 then 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' else null end,
  10 + l.n * 5,
  l.n
from public.course_modules m
join public.courses c on c.id = m.course_id
cross join generate_series(1, 3) as l(n);

-- Quizzes
insert into public.quizzes (course_id, title, description, pass_mark, created_by)
select id, title || ' – Checkpoint Quiz', 'Five quick questions to check your understanding.', 60, null from public.courses
where slug in ('beginner-robotics', 'scratch-coding', 'python-programming', 'artificial-intelligence', 'stem-explorers');

insert into public.quiz_questions (quiz_id, question, options, correct_index, position)
select q.id, v.question, v.options::jsonb, v.correct, v.pos
from public.quizzes q join public.courses c on c.id = q.course_id
join (values
 ('beginner-robotics','Which part makes a robot''s wheels turn?','["Sensor","Motor","Battery cover","Screwdriver"]',1,1),
 ('beginner-robotics','What does a sensor do?','["Stores files","Detects information from surroundings","Paints the robot","Cools the motor"]',1,2),
 ('beginner-robotics','A robot''s "brain" is usually a…','["Microcontroller","Wheel","Gear","Wire"]',0,3),
 ('beginner-robotics','Which is a renewable power source for robots?','["Solar panel","Candle","Petrol","Coal"]',0,4),
 ('scratch-coding','Which block starts a Scratch program?','["When green flag clicked","Stop all","Hide","Next costume"]',0,1),
 ('scratch-coding','A loop is used to…','["Repeat actions","Delete sprites","Save a file","Change font"]',0,2),
 ('scratch-coding','What is a sprite?','["A character or object","A sound effect","A loop","A variable"]',0,3),
 ('scratch-coding','Which block makes a decision?','["If … then","Move 10 steps","Say Hello","Wait 1 second"]',0,4),
 ('python-programming','Which prints text in Python?','["echo()","print()","write()","say()"]',1,1),
 ('python-programming','What is the type of 3.14?','["int","str","float","bool"]',2,2),
 ('python-programming','Which keyword defines a function?','["func","def","function","define"]',1,3),
 ('python-programming','What does len("bix") return?','["2","3","4","Error"]',1,4),
 ('artificial-intelligence','AI models learn mainly from…','["Data","Glue","Paint","Magnets"]',0,1),
 ('artificial-intelligence','Recognising faces in photos is called…','["Computer vision","Soldering","Gardening","Compiling"]',0,2),
 ('artificial-intelligence','A chatbot is an example of…','["Natural language processing","3D printing","Woodwork","Photosynthesis"]',0,3),
 ('artificial-intelligence','Why test a model with new data?','["To check it generalises","To make it slower","To delete data","No reason"]',0,4),
 ('stem-explorers','What does the "E" in STEM stand for?','["Energy","Engineering","Earth","Electricity"]',1,1),
 ('stem-explorers','Which tool measures temperature?','["Ruler","Thermometer","Compass","Scale"]',1,2),
 ('stem-explorers','Gears are used to…','["Change speed and force","Store water","Make light","Measure time only"]',0,3),
 ('stem-explorers','A hypothesis is…','["A testable prediction","A final answer","A lab coat","A type of rock"]',0,4)
) as v(course, question, options, correct, pos) on v.course = c.slug;

-- Store
insert into public.product_categories (name, slug, position) values
 ('Robotics Kits','robotics-kits',1), ('STEM Kits','stem-kits',2), ('Electronics Kits','electronics-kits',3),
 ('DIY Kits','diy-kits',4), ('Coding Kits','coding-kits',5), ('Accessories','accessories',6);

insert into public.products (category_id, slug, name, short_description, description, price, mrp, rating, reviews_count, age_group, image_url, specifications, box_contents, is_featured)
select pc.id, v.slug, v.name, v.short, v.descr, v.price, v.mrp, v.rating, v.reviews, v.age, v.img, v.specs::jsonb, v.box, v.featured
from (values
 ('robotics-kits','army-tank','Army Tank','Motorised tank with rotating turret and crawler treads.','Build a sturdy motorised tank with real crawler treads and a rotating turret. Learn gear ratios, torque and how tracked vehicles climb obstacles.',2499,3499,4.7,128,'8+ yrs','/__l5e/assets-v1/10c224a0-c2f6-4cdc-93a2-dcc50b167f90/product-army-tank.jpg','{"Pieces":"312","Power":"2 x AA (not included)","Build time":"3-4 hours","Skill":"Intermediate"}',array['312 building parts','DC motor with gearbox','Crawler treads','Battery box','Illustrated manual'],true),
 ('robotics-kits','space-rover','Space Rover','Six-wheel rover with robotic arm and solar panel.','A six-wheeled planetary rover with a working robotic gripper and solar panel. Explore rocker-bogie suspension like real Mars rovers.',2999,4199,4.8,96,'9+ yrs','/__l5e/assets-v1/bcd0d147-4042-40dd-a34c-2e953d661ad0/product-space-rover.jpg','{"Pieces":"280","Power":"Solar + 2 x AA","Build time":"3 hours","Skill":"Intermediate"}',array['280 parts','Solar panel','2 motors','Gripper assembly','Manual & activity cards'],true),
 ('stem-kits','machines-7-in-1-ultimate','Machines 7-in-1 Ultimate','Seven machines from one box: crane, windmill, car and more.','Build seven classic machines including a crane, windmill and racing car. Discover levers, pulleys, gears and wheels and axles.',3499,4999,4.9,214,'7+ yrs','/__l5e/assets-v1/fbacae74-e880-484d-95e0-282c2785df21/product-machines.jpg','{"Models":"7","Pieces":"420","Build time":"1-2 hours per model","Skill":"Beginner"}',array['420 parts','Gear set','Pulley set','Tool kit','7-model guide book'],true),
 ('stem-kits','machines-3-in-1-explorer','Machines 3-in-1 Explorer','Three simple machines for curious young builders.','Three models in one kit — crane, car and windmill — designed for kids starting their engineering journey.',1799,2499,4.6,88,'6+ yrs','/__l5e/assets-v1/fbacae74-e880-484d-95e0-282c2785df21/product-machines.jpg','{"Models":"3","Pieces":"190","Build time":"1 hour per model","Skill":"Beginner"}',array['190 parts','Gear set','Tool kit','Guide book'],true),
 ('stem-kits','machines-3-in-1-starter','Machines 3-in-1 Starter','Perfect first kit with big, easy-grip parts.','Large, easy-grip parts and three playful models make this the ideal first engineering kit.',1299,1799,4.5,64,'5+ yrs','/__l5e/assets-v1/fbacae74-e880-484d-95e0-282c2785df21/product-machines.jpg','{"Models":"3","Pieces":"120","Build time":"45 minutes per model","Skill":"Starter"}',array['120 large parts','Tool kit','Picture guide'],false),
 ('electronics-kits','accelero','Accelero','Build-your-own electronic racer with a programmable board.','A fast electronic racer with an exposed controller board. Learn circuits, motor drivers and speed control.',1999,2799,4.7,102,'10+ yrs','/__l5e/assets-v1/7d480dbf-911b-4ec4-ac5c-5e3447d4f109/product-accelero.jpg','{"Board":"Programmable controller","Power":"Rechargeable 3.7V pack","Build time":"2 hours","Skill":"Intermediate"}',array['Chassis & body','Controller board','DC motor','Battery pack','USB cable','Manual'],true),
 ('diy-kits','sextant','Sextant','Laser-cut wooden navigation instrument that really measures angles.','Assemble a working wooden sextant and learn how sailors navigated by the stars.',1199,1599,4.6,41,'10+ yrs','/__l5e/assets-v1/c9d6d67c-5608-4143-b15c-49859cd3ecb3/product-sextant.jpg','{"Material":"Laser-cut plywood","Pieces":"86","Build time":"2 hours"}',array['Wooden sheets','Mirrors','Eyepiece','Fasteners','Manual'],false),
 ('diy-kits','telescope','Telescope','Wooden refracting telescope with real optics and tripod.','Build a working refracting telescope on a wooden tripod and observe the Moon and planets.',1499,2099,4.8,77,'9+ yrs','/__l5e/assets-v1/8596c465-1491-40b7-9c7d-271b84be176d/product-telescope.jpg','{"Magnification":"Up to 30x","Material":"Plywood + glass optics","Build time":"2-3 hours"}',array['Wooden sheets','Objective lens','Eyepiece','Tripod parts','Star chart'],true),
 ('diy-kits','crossbow','Crossbow','Safe foam-dart wooden crossbow kit.','A safe, rubber-band powered wooden crossbow that fires foam darts. Learn about stored energy.',899,1299,4.5,59,'8+ yrs','/__l5e/assets-v1/6853fd49-f253-469c-8de3-72290cfee5ba/product-crossbow.jpg','{"Material":"Plywood","Darts":"5 foam darts","Build time":"1 hour"}',array['Wooden parts','5 foam darts','Rubber bands','Manual'],false),
 ('diy-kits','retroscope','Retroscope','Periscope + kaleidoscope optics kit.','Two optical toys in one kit — a periscope and a kaleidoscope — to explore reflection.',999,1399,4.4,33,'7+ yrs','/__l5e/assets-v1/08d1c873-7be9-488d-96fa-079c942a6215/product-retroscope.jpg','{"Material":"Plywood + mirrors","Models":"2","Build time":"1.5 hours"}',array['Wooden sheets','3 mirrors','Prism','Colour chips','Manual'],false),
 ('coding-kits','sketching-machine','Sketching Machine','Motorised drawing robot you can program.','A motor-driven drawing robot that sketches spirals and patterns — and can be programmed with BixCode.',2199,2999,4.7,52,'10+ yrs','/__l5e/assets-v1/8c222e26-32f5-4758-b2d7-328a045887f4/product-sketching.jpg','{"Motors":"2 stepper motors","Programmable":"Yes (BixCode)","Build time":"2-3 hours"}',array['Wooden frame','2 stepper motors','Controller','Pen holder','Paper pad','Manual'],true),
 ('diy-kits','vintage-projector','Vintage Projector','Wooden film projector that shows real images.','Build a charming wooden projector that throws images onto your wall and learn how lenses focus light.',1599,2199,4.6,47,'9+ yrs','/__l5e/assets-v1/d7658ba4-68b5-44ed-be40-b8efcc854efc/product-projector.jpg','{"Material":"Plywood + lens","Light":"LED module","Build time":"2 hours"}',array['Wooden sheets','Lens','LED light','Film strips','Manual'],false),
 ('diy-kits','guitar','Guitar','Playable 6-string wooden mini guitar.','Assemble and tune a playable mini guitar — a fun way to learn the science of sound.',1099,1499,4.5,38,'8+ yrs','/__l5e/assets-v1/a7f6f7fe-23b6-4835-b79a-f043fb121562/product-guitar.jpg','{"Strings":"6","Material":"Plywood","Build time":"1.5 hours"}',array['Wooden parts','Strings','Tuning pegs','Bridge','Manual'],false),
 ('accessories','robotics-spare-parts-pack','Robotics Spare Parts Pack','Extra motors, wheels and connectors for your builds.','Keep building with spare motors, wheels, axles and connectors compatible with LearningBIX kits.',499,699,4.4,25,'6+ yrs','/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg','{"Includes":"Motors, wheels, connectors"}',array['2 DC motors','4 wheels','Axles','Connector pack'],false)
) as v(cat, slug, name, short, descr, price, mrp, rating, reviews, age, img, specs, box, featured)
join public.product_categories pc on pc.slug = v.cat;

insert into public.product_images (product_id, url, position)
select id, image_url, 0 from public.products;
insert into public.product_images (product_id, url, position)
select p.id, '/__l5e/assets-v1/f5e2673e-fca8-48a5-baff-f41cad8724ed/hero-kids-robotics.jpg', 1 from public.products p;

insert into public.inventory (product_id, stock)
select id, 25 + (abs(hashtext(slug)) % 75) from public.products;