-- أسعار الهدايا (غيّرها براحتك). فيديو كل هدية: public/gifts/v/gNN.mp4 — الهدايا من 2000 فما فوق تظهر ملء الشاشة.
insert into gifts(id,name,img,price,real) values
(1,'الأسد الناري','g01',1000,false),
(2,'العنقاء','g02',5000,false),
(3,'مكوك الفضاء','g03',2000,false),
(4,'التنين','g04',3000,false),
(5,'سيارة الورد','g05',1500,false),
(6,'مدفع الألوان','g06',100,false),
(7,'زئير الأسد','g07',500,false),
(8,'مدينة المستقبل','g08',4000,false),
(9,'زيوس','g09',7000,false),
(10,'الحصان الأبيض','g10',800,false),
(11,'بوابة الطاقة','g11',600,false),
(12,'ساحة المعركة','g12',2500,false),
(13,'البوابة القديمة','g13',1200,false),
(14,'رحلة النور','g14',200,false),
(15,'النمر الأبيض','g15',1800,false),
(16,'شوكولاتة حقيقية','choco',300,true),
(17,'دبدوب حقيقي','bear',800,true)
on conflict (id) do update set name=excluded.name,img=excluded.img,price=excluded.price,real=excluded.real;
