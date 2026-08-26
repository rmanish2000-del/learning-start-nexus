// Hindi (हिंदी) dictionary for the parent-facing experience.
// Rules followed here:
//  - natural, parent-friendly Hindi, not machine transliteration
//  - fixed vocabulary: सीखने में कमी (gap), सुझाया गया अभ्यास (intervention),
//    पूर्ण सफलता योजना (Board Success Plan), जाँच रिपोर्ट (diagnostic report),
//    सीखने का लक्ष्य (learning outcome), महारत (mastery)
//  - proper nouns stay as-is: EduOS, CBSE, Razorpay, UPI, AI
// Any key absent here falls back to the English copy in the component.

export const HI: Record<string, string> = {
  // ---------------------------------------------------------------- common
  "common.language": "भाषा",
  "common.signIn": "साइन इन करें",
  "common.back": "पीछे",
  "common.next": "आगे",
  "common.retry": "फिर कोशिश करें",
  "common.secureCheckout": "सुरक्षित भुगतान",
  "common.privacy": "निजता नीति",
  "common.terms": "शर्तें",
  "common.contact": "संपर्क",
  "common.about": "हमारे बारे में",
  "common.perYear": "प्रति वर्ष",
  "common.days": "दिन",
  "common.day": "दिन",

  // --------------------------------------------------------------- landing
  "landing.nav.how": "यह कैसे काम करता है",
  "landing.nav.evidence": "प्रमाण",
  "landing.nav.faq": "सामान्य प्रश्न",
  "landing.nav.parents": "अभिभावकों के लिए",
  "landing.nav.pilot": "पायलट के लिए आवेदन करें",
  "landing.nav.diagnostic": "₹199 की जाँच शुरू करें",

  "landing.hero.badge": "ट्यूशन सेंटर के लिए लर्निंग इंटेलिजेंस",
  "landing.hero.title": "सीखने की कमी दूर हुई — यह दिखाइए, सिर्फ़ कहिए मत।",
  "landing.hero.lede":
    "EduOS पूरा चक्र चलाता है — जाँच, कमी की पहचान, सुझाया गया अभ्यास, सवाल-जवाब वाला AI शिक्षक, नए प्रश्नों पर दोबारा जाँच — और अंत में ऐसा प्रमाण देता है जिसे एक समीक्षक ने प्रमाणित किया हो।",
  "landing.hero.ctaPrimary": "पायलट के लिए आवेदन करें",
  "landing.hero.ctaSecondary": "नमूना रिपोर्ट देखें",
  "landing.hero.parentCta": "अभिभावक हैं? ₹199 में अपने बच्चे की जाँच कराइए",

  "landing.sample.label": "गोपनीय पायलट नमूना — किसी वास्तविक बच्चे का डेटा नहीं",

  "landing.proof.0.label": "कमियाँ दूर होने की दर",
  "landing.proof.0.note": "अभ्यास के बाद दूर हुई कमियाँ, पायलट समूह",
  "landing.proof.1.label": "औसत महारत में बढ़त",
  "landing.proof.1.note": "पहली जाँच बनाम नए प्रश्नों पर दोबारा जाँच",
  "landing.proof.2.label": "प्रमाणित प्रमाण पंक्तियाँ",
  "landing.proof.2.note": "हर एक पर एक नामित समीक्षक के हस्ताक्षर",

  "landing.how.eyebrow": "EduOS कैसे काम करता है",
  "landing.how.title": "एक चक्र, तीन भूमिकाएँ",
  "landing.how.lede": "सेंटर में हर कोई अपनी ओर से यही चक्र चलाता है।",
  "landing.role.Educator": "शिक्षक",
  "landing.role.Student": "विद्यार्थी",
  "landing.role.Parent": "अभिभावक",
  "landing.role.Educator.0": "पाठ्यक्रम से जुड़ी जाँच सौंपें",
  "landing.role.Educator.1": "कमियों का नक्शा देखें, सबसे कमज़ोर बच्चे से शुरू करें",
  "landing.role.Educator.2": "सुझाए गए अभ्यास को मंज़ूरी दें",
  "landing.role.Educator.3": "नए प्रश्नों पर दोबारा जाँच करें और प्रमाण पर हस्ताक्षर करें",
  "landing.role.Student.0": "फ़ोन पर एक छोटी जाँच दें",
  "landing.role.Student.1": "देखें कि कौन-सा सीखने का लक्ष्य कमज़ोर है",
  "landing.role.Student.2": "सवाल-जवाब वाले शिक्षक के साथ उसी पर काम करें",
  "landing.role.Student.3": "नए प्रश्नों पर दोबारा जाँच दें और महारत बढ़ते देखें",
  "landing.role.Parent.0": "सरल भाषा में देखें कि बच्चा कहाँ अटका है",
  "landing.role.Parent.1": "देखें कि सेंटर ने उस पर क्या किया",
  "landing.role.Parent.2": "देखें कि फ़र्क पड़ा या नहीं — मापा हुआ, कहा हुआ नहीं",
  "landing.role.Parent.3": "AI शिक्षक की अनुमति कभी भी दें या वापस लें",

  "landing.loop.eyebrow": "कमी दूर करने का चक्र",
  "landing.loop.title": "जाँच → कमी → अभ्यास → AI शिक्षक → दोबारा जाँच → प्रमाण",
  "landing.loop.lede":
    "एक बच्चे (नाम गोपनीय) को हर चरण से गुज़रते देखिए। हर चरण एक असली दस्तावेज़ बनाता है — देखने के लिए चरण चुनिए।",
  "landing.loop.step": "चरण {n}",
  "landing.loop.diagnostic.title": "जाँच",
  "landing.loop.diagnostic.artefact": "जाँच का अंक",
  "landing.loop.diagnostic.detail": "पाठ्यक्रम से जुड़े प्रश्न, हर सीखने के लक्ष्य पर संतुलित।",
  "landing.loop.gap.title": "कमी मिली",
  "landing.loop.gap.artefact": "कमज़ोर लक्ष्य",
  "landing.loop.gap.detail": "अंक पूरे पेपर पर नहीं, हर लक्ष्य पर लगते हैं — इसलिए कमी सटीक होती है।",
  "landing.loop.intervention.title": "सुझाया गया अभ्यास",
  "landing.loop.intervention.artefact": "मंज़ूर की गई योजना",
  "landing.loop.intervention.detail": "एक तय सुझाव, जिसे शिक्षक मंज़ूर या अस्वीकार करता है।",
  "landing.loop.tutor.title": "AI शिक्षक",
  "landing.loop.tutor.artefact": "अभ्यास के मिनट",
  "landing.loop.tutor.detail":
    "केवल सवाल-जवाब से सिखाता है, मंज़ूर अभ्यास तक सीमित, और अनुमति के बाद ही।",
  "landing.loop.reassessment.title": "दोबारा जाँच",
  "landing.loop.reassessment.artefact": "नए प्रश्नों पर जाँच",
  "landing.loop.reassessment.detail": "पहली जाँच के प्रश्न बिल्कुल दोहराए नहीं जाते, इसलिए बढ़त असली होती है।",
  "landing.loop.evidence.title": "प्रमाण",
  "landing.loop.evidence.artefact": "प्रमाणित पंक्ति",
  "landing.loop.evidence.detail": "शुरुआत, कार्रवाई, दोबारा जाँच और बढ़त — एक ही जाँचने योग्य कड़ी में।",

  "landing.safety.eyebrow": "AI शिक्षक की सुरक्षा",
  "landing.safety.title": "शिक्षक पढ़ाता है। रिकॉर्ड को कभी नहीं छूता।",
  "landing.safety.lede": "ये सीमाएँ सॉफ़्टवेयर में लागू हैं, किसी नीति के वादे भर नहीं।",
  "landing.safety.can": "यह क्या कर सकता है",
  "landing.safety.cannot": "यह क्या नहीं कर सकता",
  "landing.safety.can.0": "समझाता है, संकेत देता है, हल किए उदाहरण और अभ्यास प्रश्न देता है",
  "landing.safety.can.1": "केवल शिक्षक द्वारा मंज़ूर अभ्यास के भीतर काम करता है",
  "landing.safety.can.2": "अभिभावक की अनुमति के बाद ही चलता है, जो कभी भी वापस ली जा सकती है",
  "landing.safety.cannot.0": "किसी भी अंक को लिख, बदल या प्रभावित नहीं कर सकता",
  "landing.safety.cannot.1": "प्रमाण बना, बदल या प्रमाणित नहीं कर सकता",
  "landing.safety.cannot.2": "अपने सेंटर के बाहर किसी बच्चे को नहीं देख सकता",
  "landing.safety.cannot.3": "सीधा उत्तर नहीं देता — सवाल पूछकर सिखाता है",
  "landing.safety.fallback":
    "अगर AI उपलब्ध न हो तो शिक्षक शिक्षकों द्वारा जाँची गई तय व्याख्याओं पर लौट आता है। यह कभी खुली, बेरोक बातचीत में नहीं बदलता।",

  "landing.evidence.eyebrow": "नमूना प्रमाण",
  "landing.evidence.title": "एक पूरी प्रमाण-कड़ी, शुरुआत से हस्ताक्षर तक",
  "landing.evidence.lede":
    "समीक्षक यही दस्तावेज़ जाँचता है। शुरुआती स्तर, कार्रवाई, दोबारा जाँच, बढ़त और प्रमाणक — एक ही जगह।",
  "landing.evidence.card": "प्रमाण-कड़ी",
  "landing.evidence.note":
    "दोबारा जाँच में वही प्रश्न कभी नहीं आते जो बच्चा पहले देख चुका है, इसलिए बढ़त बढ़ा-चढ़ाकर नहीं दिखाई जा सकती।",
  "landing.evidence.row.Learner": "बच्चा",
  "landing.evidence.row.Outcome": "सीखने का लक्ष्य",
  "landing.evidence.row.Baseline": "शुरुआती स्तर",
  "landing.evidence.row.Gap band": "कमी का स्तर",
  "landing.evidence.row.Intervention": "सुझाया गया अभ्यास",
  "landing.evidence.row.Tutor": "AI शिक्षक",
  "landing.evidence.row.Reassessment": "दोबारा जाँच",
  "landing.evidence.row.Mastery lift": "महारत में बढ़त",
  "landing.evidence.row.Verification": "प्रमाणन",

  "landing.parents.eyebrow": "अभिभावकों के लिए",
  "landing.parents.title": "तीन सवाल, प्रमाण के साथ जवाब",
  "landing.parents.lede":
    "AI शिक्षक के लिए अभिभावक की अनुमति ज़रूरी है। अनुमति दिखती है, जाँची जा सकती है और कभी भी वापस ली जा सकती है।",
  "landing.parents.q0": "मेरा बच्चा कहाँ अटका है?",
  "landing.parents.a0": "एक नामित सीखने का लक्ष्य, न कि पूरे विषय का धुँधला ग्रेड।",
  "landing.parents.q1": "उस पर क्या किया गया?",
  "landing.parents.a1": "मंज़ूर किया गया अभ्यास और उस कमी पर AI शिक्षक के साथ बिताया हर मिनट।",
  "landing.parents.q2": "क्या सच में फ़र्क पड़ा?",
  "landing.parents.a2": "ऐसे प्रश्नों पर दोबारा जाँच जो बच्चे ने पहले कभी नहीं देखे, और उसमें हुई बढ़त।",
  "landing.parents.report.title": "पाक्षिक प्रगति रिपोर्ट",
  "landing.parents.report.0": "मिली कमियाँ",
  "landing.parents.report.1": "दूर हुई कमियाँ",
  "landing.parents.report.2": "औसत महारत बढ़त",
  "landing.parents.report.3": "AI शिक्षक के मिनट",
  "landing.parents.report.4": "अभिभावक की अनुमति",

  "landing.centres.eyebrow": "ट्यूशन सेंटर के लिए",
  "landing.centres.title": "शिक्षकों का समय बचे, और नवीनीकरण के समय प्रमाण हो",

  "landing.faq.eyebrow": "सामान्य प्रश्न",
  "landing.faq.title": "जो सवाल असल में पूछे जाते हैं",

  "landing.pilot.eyebrow": "पायलट कार्यक्रम",
  "landing.pilot.title": "एक कक्षा, एक विषय चलाइए और प्रमाण देखिए",
  "landing.pilot.lede":
    "अपने सेंटर के बारे में बताइए — हम पायलट की सीमा, समय-सीमा और ज़रूरतें लेकर वापस आएँगे।",

  // -------------------------------------------------- diagnostic (purchase)
  "diag.badge": "CBSE कक्षा 10 · एक बार का शुल्क {price}",
  "diag.hero.title": "जानिए कि आपका बच्चा असल में कहाँ अंक गँवा रहा है।",
  "diag.hero.lede":
    "आपके चुने हुए अध्याय-समूह के CBSE सीखने के लक्ष्यों से जुड़े अधिकतम 20 प्रश्नों की जाँच। रिपोर्ट उसी बैठक में मिल जाती है।",
  "diag.choose.title": "क्या जाँचना है, चुनिए",
  "diag.field.subject": "बोर्ड और विषय",
  "diag.field.subject.placeholder": "विषय चुनिए",
  "diag.field.unit": "अध्याय-समूह",
  "diag.field.unit.placeholder": "अध्याय-समूह चुनिए",
  "diag.field.unit.placeholderLocked": "पहले विषय चुनिए",
  "diag.unit.option": "{title} · {n} लक्ष्य",
  "diag.subject.option": "{board} कक्षा {grade} · {subject}",
  "diag.unit.summary":
    "{n} प्रश्न, {outcomes} सीखने के लक्ष्यों पर बोर्ड के भार के अनुसार बाँटे गए। कुछ भी चुनिए, कीमत {price} ही रहेगी।",
  "diag.loading.error": "विषय लोड नहीं हो सके",
  "diag.empty": "अभी कक्षा 10 का कोई विषय उपलब्ध नहीं है। कृपया थोड़ी देर बाद देखिए।",
  "diag.cta": "जाँच शुरू करें — {price}",
  "diag.toast.chooseFirst": "पहले विषय और अध्याय-समूह चुनिए।",
  "diag.toast.startFailed": "भुगतान शुरू नहीं हो सका।",

  "diag.get.title": "{price} में आपको क्या मिलता है",
  "diag.get.0.title": "हर लक्ष्य पर महारत का स्तर",
  "diag.get.0.detail": "अध्याय-समूह के हर सक्रिय लक्ष्य पर — कमज़ोर · बनता हुआ · मज़बूत · बहुत मज़बूत।",
  "diag.get.1.title": "नाम सहित कमियाँ, क्रम में",
  "diag.get.1.detail": "बोर्ड में भार × गंभीरता के क्रम में, और हर कमी पर छूटे हुए प्रश्न।",
  "diag.get.2.title": "सुझाया गया अभ्यास",
  "diag.get.2.detail": "हर कमी के लिए वही अभ्यास जो हमारा सिस्टम उस लक्ष्य से जोड़ता है।",
  "diag.get.3.title": "रिपोर्ट जो आपके पास रहती है",
  "diag.get.3.detail": "आपके लिंक से हमेशा उपलब्ध, चाहे आप योजना लें या न लें।",

  "diag.why.title": "यह कोई साधारण क्विज़ क्यों नहीं है",
  "diag.why.0":
    "हर प्रश्न आपके बच्चे के अध्याय-समूह के एक नामित CBSE सीखने के लक्ष्य से जुड़ा है — किसी ढीले-ढाले विषय नाम से नहीं।",
  "diag.why.1":
    "जाँच हमारे सर्वर पर उन्हीं लक्ष्यों के आधार पर होती है, इसलिए रिपोर्ट बताती है कि कौन-सा लक्ष्य कमज़ोर है, सिर्फ़ यह नहीं कि कौन-से प्रश्न ग़लत हुए।",
  "diag.why.2":
    "बाद की दोबारा जाँच में नए प्रश्न आते हैं, इसलिए रटकर सुधार दिखाना संभव नहीं है।",

  "diag.price.note":
    "एक बार का शुल्क। कोई अपने-आप नवीनीकरण नहीं, EduOS आपका कार्ड नहीं रखता। अगर जाँच कभी जमा नहीं हुई तो 7 दिन में पूरा पैसा वापस।",
  "diag.trust.secure": "सुरक्षित भुगतान",
  "diag.trust.methods": "UPI · कार्ड · नेटबैंकिंग",
  "diag.trust.noCalls": "कोई मार्केटिंग कॉल नहीं",
  "diag.trust.india": "डेटा भारत में रहता है",

  "diag.faq.title": "अभिभावकों के सवाल",
  "diag.faq.0.q": "इसमें कितना समय लगता है?",
  "diag.faq.0.a":
    "लगभग 20 मिनट। अधिकतम बीस प्रश्न, एक स्क्रीन पर एक, और हर उत्तर के बाद प्रगति सहेज ली जाती है — उसी लिंक पर रोककर बाद में जारी रख सकते हैं।",
  "diag.faq.1.q": "इसे कौन देखेगा या निगरानी करेगा?",
  "diag.faq.1.a":
    "कोई नहीं। न निगरानी है, न कोई रैंक। रिपोर्ट तभी काम की है जब वह दिखाए कि बच्चा बिना मदद के क्या कर सकता है — इसलिए मदद न करना ही सही है।",
  "diag.faq.2.q": "क्या यह फ़ोन पर हो सकता है?",
  "diag.faq.2.a": "हाँ। भुगतान, जाँच और रिपोर्ट — पूरा रास्ता फ़ोन को ध्यान में रखकर बनाया गया है।",
  "diag.faq.3.q": "अगर मेरे बच्चे के अंक कम आए तो?",
  "diag.faq.3.a":
    "रिपोर्ट फ़ैसला नहीं, जाँच है। जो पहले से मज़बूत है वह भी बताती है, और हर कमी के साथ उसे दूर करने वाला अभ्यास देती है।",
  "diag.faq.4.q": "क्या ₹199 योजना में समायोजित होंगे?",
  "diag.faq.4.a":
    "हाँ। अगर आप {days} दिन के भीतर पूर्ण सफलता योजना लेते हैं तो ₹199 पहले साल में घटा दिए जाते हैं — आप {plan} की जगह {discounted} देते हैं।",
  "diag.faq.5.q": "डेटा का क्या होता है?",
  "diag.faq.5.a":
    "यह आपके बच्चे के सीखने के रिकॉर्ड में रखा जाता है और केवल रिपोर्ट व योजना बनाने के काम आता है। आप संपर्क पेज से कभी भी इसे मिटाने को कह सकते हैं।",

  // ------------------------------------------------------------- checkout
  "checkout.title": "पुष्टि कीजिए और भुगतान कीजिए",
  "checkout.lede":
    "भुगतान से पहले खाता बनाने की ज़रूरत नहीं। इन्हीं जानकारियों से हम आपके बच्चे का सीखने का रिकॉर्ड बनाते हैं।",
  "checkout.details": "आपकी जानकारी",
  "checkout.child": "बच्चे का पहला नाम",
  "checkout.parent": "आपका नाम",
  "checkout.parent.placeholder": "माता-पिता या अभिभावक",
  "checkout.email": "ईमेल",
  "checkout.phone": "मोबाइल नंबर",
  "checkout.secureNote":
    "भुगतान Razorpay द्वारा सुरक्षित रूप से लिया जाता है। EduOS आपके कार्ड की जानकारी न देखता है न रखता है — भुगतान की पुष्टि होते ही जाँच तैयार हो जाती है।",
  "checkout.pay": "{price} देकर शुरू करें",
  "checkout.paying": "भुगतान की पुष्टि हो रही है…",
  "checkout.provisioning": "जाँच तैयार की जा रही है…",
  "checkout.summary": "ऑर्डर का विवरण",
  "checkout.row.board": "बोर्ड और कक्षा",
  "checkout.row.subject": "विषय",
  "checkout.row.unit": "अध्याय-समूह",
  "checkout.row.diagnostic": "जाँच",
  "checkout.refund":
    "एक बार का शुल्क। कोई अपने-आप नवीनीकरण नहीं। जाँच कभी जमा न होने पर 7 दिन में पूरा पैसा वापस।",
  "checkout.bullet.0": "बोर्ड के भार के अनुसार बँटे, लक्ष्य से जुड़े प्रश्न",
  "checkout.bullet.1": "CBSE लक्ष्यों के आधार पर सर्वर पर जाँच",
  "checkout.bullet.2": "क्रम में लगी कमियों की रिपोर्ट, जो हमेशा आपके पास रहेगी",
  "checkout.error.notFound": "यह ऑर्डर नहीं मिला",
  "checkout.error.details": "जानकारी जाँचिए — रिपोर्ट का लिंक भेजने के लिए सही ईमेल और मोबाइल नंबर चाहिए।",
  "checkout.error.gateway": "भुगतान सेवा अभी उपलब्ध नहीं है।",
  "checkout.error.notCaptured": "भुगतान पूरा नहीं हुआ।",
  "checkout.error.failed": "भुगतान पूरा नहीं हो सका।",
  "checkout.cancelled": "भुगतान रद्द हुआ। आपसे कोई शुल्क नहीं लिया गया।",

  // -------------------------------------------------------------- session
  "session.title": "{name} की जाँच · {subject}",
  "session.answered": "{n} में से {total} प्रश्न हो गए",
  "session.saveNote": "हर उत्तर अपने-आप सहेजा जाता है — आप यह पेज बंद करके उसी लिंक पर लौट सकते हैं।",
  "session.question": "प्रश्न {n} / {total} · लक्ष्य {code}",
  "session.saving": "सहेजा जा रहा है…",
  "session.freeAnswer": "आपका उत्तर",
  "session.freeAnswer.placeholder": "उत्तर लिखिए",
  "session.submit": "जमा करें और अंक देखें",
  "session.empty": "इस जाँच में कोई प्रश्न नहीं है।",
  "session.invalid": "यह जाँच लिंक मान्य नहीं है",
  "session.error.save": "यह उत्तर सहेजा नहीं जा सका।",
  "session.error.submit": "जाँच जमा नहीं हो सकी।",

  // --------------------------------------------------------------- report
  "report.invalid": "यह रिपोर्ट लिंक मान्य नहीं है",
  "report.unfinished": "जाँच अभी पूरी नहीं हुई है",
  "report.unfinished.body": "प्रगति सहेजी हुई है। {name} जहाँ छोड़कर गए थे वहीं से शुरू कीजिए, रिपोर्ट यहीं दिखेगी।",
  "report.resume": "जाँच जारी रखें",
  "report.headline": "{unit} के {total} में से {secure} लक्ष्यों पर {name} मज़बूत या उससे बेहतर हैं।",
  "report.subline":
    "{outcomes} CBSE सीखने के लक्ष्यों पर {questions} प्रश्नों के आधार पर सर्वर पर जाँचा गया। {correct} सही।",
  "report.print": "डाउनलोड / प्रिंट",
  "report.share": "रिपोर्ट साझा करें",
  "report.share.copied": "रिपोर्ट का लिंक कॉपी हो गया।",
  "report.share.failed": "लिंक साझा नहीं हो सका।",
  "report.bandSuffix": "लक्ष्य",
  "report.gaps.title": "सीखने में कमियाँ, क्रम में ({n})",
  "report.gaps.none": "कोई भी लक्ष्य 70% से नीचे नहीं रहा। इस अध्याय-समूह में अभी किसी सुधार की ज़रूरत नहीं है।",
  "report.gaps.lede":
    "बोर्ड में भार × गंभीरता के क्रम में। इस अध्याय-समूह के लगभग {marks} में से ~{total} अंक इन्हीं लक्ष्यों पर टिके हैं — यह ब्लूप्रिंट के भार से लगाया अनुमान है, भविष्यवाणी नहीं।",
  "report.gap.marksAtRisk": "~{n} अंक जोखिम में",
  "report.gap.missed": "इस लक्ष्य के {total} में से {missed} प्रश्न छूट गए। गंभीरता: {severity}।",
  "report.gap.start": "कहाँ से शुरू करें",
  "report.secure.title": "क्या पहले से अच्छा है",
  "report.secure.none": "इस बार कोई भी लक्ष्य 70% पार नहीं कर सका। योजना ऊपर बताई सबसे भारी कमी से शुरू होती है।",
  "report.projection.title": "{weeks} हफ़्तों का कमी-निवारण अनुमान",
  "report.projection.0":
    "ऊपर दी कमियों के लिए चक्र इस तरह चलता है: लक्षित अभ्यास → उसी लक्ष्य तक सीमित AI शिक्षक → ऐसे नए प्रश्नों पर दोबारा जाँच जो पहली जाँच में नहीं आए थे।",
  "report.projection.1":
    "हमारे पायलट समूह आम तौर पर {weeks} हफ़्तों में जिन लक्ष्यों पर काम करते हैं उन पर {low}–{high} अंक की महारत बढ़त पाते हैं। यह पायलट के औसत पर आधारित अनुमान है, {name} के बारे में कोई वादा नहीं।",
  "report.bands.note":
    "स्तर: {list}। कमज़ोर 40% से नीचे, बनता हुआ 40–59%, मज़बूत 60–79%, बहुत मज़बूत 80%+। 70% से कम वाले लक्ष्य को कमी माना जाता है — यही सीमा हमारे सेंटर भी इस्तेमाल करते हैं, इसलिए ये आँकड़े प्लेटफ़ॉर्म के अंदर वाले आँकड़ों से मेल खाते हैं।",

  // ---------------------------------------------------------- upgrade / plan
  "upgrade.headline.gaps": "इस साल {n} कमियाँ दूर कीजिए",
  "upgrade.headline.secure": "इस स्तर को बोर्ड तक बनाए रखिए",
  "upgrade.badge": "पूर्ण सफलता योजना · एक बच्चा · एक बोर्ड वर्ष",
  "upgrade.title.gaps": "{name} की {n} खुली कमियाँ इस साल दूर कीजिए।",
  "upgrade.title.secure": "{name} का स्तर पूरे बोर्ड वर्ष बनाए रखिए।",
  "upgrade.atRisk": "अभी जोखिम में: {codes}{more} — इस अध्याय-समूह के लगभग {marks} में से करीब {total} अंक।",
  "upgrade.more": " और {n} अन्य",
  "upgrade.active.title": "योजना पहले से चालू है",
  "upgrade.active.body": "ऑर्डर {ref}। रिपोर्ट की हर सुविधा {name} के लिए खुली है।",
  "upgrade.backToReport": "रिपोर्ट पर वापस जाएँ",
  "upgrade.pay.title": "आप कितना देंगे",
  "upgrade.firstYear": "पहले साल के लिए · {credit} की जाँच राशि घटाई गई · अगला नवीनीकरण {plan}/वर्ष",
  "upgrade.perYear": "प्रति वर्ष · हर साल नवीनीकरण",
  "upgrade.creditWindow":
    "यह छूट और {n} दिन उपलब्ध है। उसके बाद योजना {plan} की होगी, बिना किसी छूट के।",
  "upgrade.changes": "आज से क्या बदलेगा",
  "upgrade.unlock.0":
    "इस रिपोर्ट की हर कमी पर असीमित AI शिक्षक, उस लक्ष्य के मंज़ूर अभ्यास तक सीमित।",
  "upgrade.unlock.1": "नए प्रश्नों पर दोबारा जाँच, जो पहली जाँच में कभी नहीं आए — इसलिए बढ़त असली होती है।",
  "upgrade.unlock.2": "कक्षा के सभी विषयों में असीमित जाँच, सिर्फ़ खरीदे गए अध्याय-समूह में नहीं।",
  "upgrade.unlock.3": "पाक्षिक अभिभावक रिपोर्ट: मिली कमियाँ, दूर हुई कमियाँ, महारत बढ़त, शिक्षक के मिनट।",
  "upgrade.unlock.4": "हर दूर हुई कमी के लिए प्रमाणक के नाम सहित प्रमाण-संग्रह।",
  "upgrade.secureNote":
    "भुगतान Razorpay द्वारा सुरक्षित रूप से लिया जाता है। EduOS आपके कार्ड की जानकारी न देखता है न रखता है।",
  "upgrade.cta": "योजना शुरू करें — {price}",
  "upgrade.foot.0": "कभी भी बंद कीजिए, अवधि पूरी होने तक सुविधा चलती रहेगी",
  "upgrade.foot.1": "EduOS कोई कार्ड नहीं रखता",
  "upgrade.foot.2": "कहने पर डेटा मिटा दिया जाएगा",
  "upgrade.foot.3": "भाई-बहन के लिए योजना {price}",
  "upgrade.invalid": "यह लिंक मान्य नहीं है",
  "upgrade.success": "पूर्ण सफलता योजना चालू हो गई।",
  "upgrade.failed": "योजना शुरू नहीं हो सकी।",
  "upgrade.report.cta.gaps": "ये {n} कमियाँ दूर कीजिए — {price}",
  "upgrade.report.cta.secure": "पूर्ण सफलता योजना देखिए — {price}",
  "upgrade.report.active": "पूर्ण सफलता योजना चालू — {ref}",
  "upgrade.report.keep": "यह रिपोर्ट आपके लिंक पर बनी रहेगी, चाहे आप योजना लें या न लें।",
  "upgrade.report.benefit.0": "कक्षा के सभी विषयों में असीमित जाँच और नए प्रश्नों पर दोबारा जाँच।",
  "upgrade.report.benefit.1": "असीमित AI शिक्षक, इन लक्ष्यों के मंज़ूर अभ्यास तक सीमित।",
  "upgrade.report.benefit.2": "पाक्षिक अभिभावक रिपोर्ट — मिली कमियाँ, दूर हुई कमियाँ, महारत बढ़त, शिक्षक के मिनट।",
  "upgrade.creditLine": "पहले साल के लिए · {credit} की जाँच राशि घटाई गई · {days} दिन शेष",

  // ------------------------------------------------------- mastery bands
  "band.weak": "कमज़ोर",
  "band.developing": "बनता हुआ",
  "band.secure": "मज़बूत",
  "band.strong": "बहुत मज़बूत",
  "severity.high": "अधिक",
  "severity.moderate": "मध्यम",
  "severity.low": "कम",

  // ------------------------------------------------- parent portal (signed in)
  "portal.title": "अभिभावक पोर्टल",
  "portal.welcome": "नमस्ते{name}। प्रगति देखिए और अनुमति संभालिए — यहाँ सब कुछ केवल पढ़ने के लिए है।",
  "portal.checklist.title": "अभिभावक के रूप में शुरुआत",
  "portal.checklist.description": "आपके परिवार का अनुभव तैयार करने के दो छोटे कदम।",
  "portal.step.consent.title": "अनुमति देखिए और दर्ज कीजिए",
  "portal.step.consent.done": "अनुमति चालू है — AI शिक्षक खुल गया है।",
  "portal.step.consent.todo": "अनुमति से AI शिक्षक खुलता है। जाँच और सीखने की योजनाएँ वैसे भी चलती रहती हैं।",
  "portal.step.consent.cta": "अनुमति देखें",
  "portal.step.progress.title": "प्रगति देखिए",
  "portal.step.progress.description": "मौजूदा महारत, हाल की जाँच के अंक और चल रहे अभ्यास देखिए।",
  "portal.step.progress.cta": "प्रगति देखें",
  "portal.error.children": "आपके बच्चों की जानकारी लोड नहीं हो सकी",
  "portal.empty.title": "अभी कोई बच्चा जुड़ा नहीं है",
  "portal.empty.body":
    "आपका खाता किसी बच्चे से जुड़ा नहीं है। अपने ट्यूशन सेंटर के प्रशासक से इस खाते के साथ अपने बच्चे को जोड़ने को कहिए।",
  "portal.empty.hint": "जुड़ते ही प्रगति और अनुमति के नियंत्रण यहाँ अपने-आप दिखने लगेंगे।",
  "portal.card.mastery": "महारत",
  "portal.card.assessments": "जाँचें",
  "portal.card.submitted": "जमा हुईं",
  "portal.card.interventions": "सुझाए गए अभ्यास",
  "portal.card.active": "चालू",
  "portal.lift": "{n} बढ़त",
  "portal.chart.title": "समय के साथ महारत",
  "portal.chart.empty.title": "अभी कोई महारत डेटा नहीं",
  "portal.chart.empty.body": "जाँच पूरी होने पर महारत दर्ज होती है। पहली जाँच के बाद देखिए।",
  "portal.recent.title": "हाल की जाँचें",
  "portal.recent.empty": "अभी कोई जाँच नहीं सौंपी गई है।",
  "portal.recent.submitted": "जाँच जमा हुई",
  "portal.recent.inProgress": "जाँच चल रही है",
  "portal.interventions.title": "सुझाए गए अभ्यास और परिणाम",
  "portal.interventions.empty":
    "अभी कोई अभ्यास नहीं — जब किसी कमी का पता चलेगा तब ये यहाँ दिखेंगे।",
  "portal.intervention.target": "लक्ष्य तिथि {date}",
  "portal.outcome": "लक्ष्य: {from}% → {to}",
  "portal.pending": "बाकी",
  "portal.consent.title": "{name} के लिए अभिभावक अनुमति",
  "portal.consent.active": "अनुमति चालू",
  "portal.consent.needed": "अनुमति चाहिए",
  "portal.consent.body":
    "अनुमति से AI शिक्षक खुलता है। जाँच और सीखने की योजनाएँ अनुमति के बिना भी चलती हैं। अनुमति का इतिहास कभी मिटाया नहीं जाता।",
  "portal.consent.mobile": "आपका मोबाइल नंबर",
  "portal.consent.record": "अनुमति दर्ज करें",
  "portal.consent.recording": "दर्ज हो रही है…",
  "portal.consent.withdrawBody":
    "आप कभी भी अनुमति वापस ले सकते हैं। AI शिक्षक तुरंत बंद हो जाता है; जाँच और सीखने की योजनाएँ चलती रहती हैं, और अनुमति का इतिहास सुरक्षित रहता है।",
  "portal.consent.withdraw": "अनुमति वापस लें",
  "portal.consent.withdrawing": "वापस ली जा रही है…",
  "portal.consent.history": "अनुमति का इतिहास",
  "portal.consent.granted": "दी गई",
  "portal.consent.withdrawn": "वापस ली गई",
  "portal.consent.toast.recorded": "अनुमति दर्ज हुई — AI शिक्षक खुल गया",
  "portal.consent.toast.withdrawn": "अनुमति वापस ली गई — AI शिक्षक अब बंद है",
  "portal.consent.toast.recordFailed": "अनुमति दर्ज नहीं हो सकी",
  "portal.consent.toast.withdrawFailed": "अनुमति वापस नहीं ली जा सकी",
};

// Landing: parent questions, centre benefits and FAQs (appended for clarity).
Object.assign(HI, {
  "landing.parents.sample.note": "गोपनीय नमूना",
  "landing.centres.0.title": "एक ही स्क्रीन पर प्राथमिकता",
  "landing.centres.0.body":
    "कमियों का नक्शा हर बच्चे को बची हुई कमियों के क्रम में लगाता है, इसलिए शिक्षक बिना कोई रिपोर्ट खोले जान जाता है कि पहले किसे देखना है।",
  "landing.centres.1.title": "सूची नहीं, एक कतार",
  "landing.centres.1.body":
    "अभ्यास की कतार काम को ज़रूरत के क्रम में लगाती है और रुके हुए मामलों पर निशान लगाती है, इसलिए कुछ भी हफ़्तों तक अछूता नहीं रहता।",
  "landing.centres.2.title": "ऐसी पकड़ जिसे आप साबित कर सकें",
  "landing.centres.2.body":
    "नवीनीकरण की बातचीत हाज़िरी और भरोसे पर नहीं, हर बच्चे के प्रमाणित पहले/बाद के प्रमाण पर होती है।",

  "landing.faq.0.q": "डेटा का मालिक कौन है?",
  "landing.faq.0.a":
    "सेंटर। हर रिकॉर्ड आपके संगठन तक सीमित है और यह सीमा डेटाबेस स्तर पर लागू होती है, सिर्फ़ ऐप के कोड से नहीं।",
  "landing.faq.1.q": "अनुमति कैसे ली जाती है?",
  "landing.faq.1.a":
    "AI शिक्षक के लिए हर बच्चे पर अभिभावक की साफ़ अनुमति ज़रूरी है। अनुमति अभिभावक को दिखती है, जाँची जा सकती है और कभी भी वापस ली जा सकती है — वापस लेते ही शिक्षक तुरंत बंद हो जाता है।",
  "landing.faq.2.q": "AI शिक्षक क्या नहीं कर सकता?",
  "landing.faq.2.a":
    "वह कोई अंक न लिख सकता है न बदल सकता है, प्रमाण न बना सकता है न उस पर हस्ताक्षर कर सकता है, शिक्षक द्वारा मंज़ूर अभ्यास से बाहर काम नहीं कर सकता, और आपके सेंटर के बाहर किसी बच्चे को नहीं देख सकता।",
  "landing.faq.3.q": "महारत में बढ़त कैसे गिनी जाती है?",
  "landing.faq.3.a":
    "उसी सीखने के लक्ष्य पर दोबारा जाँच का अंक घटा शुरुआती अंक, जहाँ दोबारा जाँच में पहली जाँच से एक भी प्रश्न दोहराया नहीं जाता।",
  "landing.faq.4.q": "कमी दूर हुई, यह कब माना जाता है?",
  "landing.faq.4.a":
    "कमी तभी दूर मानी जाती है जब उस लक्ष्य पर नए प्रश्नों वाली दोबारा जाँच महारत की सीमा तक पहुँचे। सिर्फ़ शिक्षक के साथ बिताया समय कभी कमी दूर नहीं करता।",
  "landing.faq.5.q": "कौन-से बोर्ड और कक्षाएँ शामिल हैं?",
  "landing.faq.5.a":
    "पाठ्यक्रम आपकी अपनी किताबों और सिलेबस से लिया जाता है, इसलिए दायरा उसी पर निर्भर करता है जो आप अपलोड करते हैं। पायलट की सामग्री CBSE के अनुरूप है।",
  "landing.faq.6.q": "क्या कोई बाहरी समीक्षक हमारे दावे जाँच सकता है?",
  "landing.faq.6.a":
    "हाँ। समीक्षकों को प्रमाणन केंद्रों तक केवल पढ़ने की सुविधा मिलती है, जहाँ हर दावे को उसकी जाँच, अभ्यास, शिक्षक-लॉग और दोबारा जाँच तक पीछे जाकर देखा जा सकता है।",
  "landing.faq.7.q": "पायलट में क्या होता है?",
  "landing.faq.7.a":
    "एक कक्षा और एक विषय पर तय अवधि का पायलट: हम आपका पाठ्यक्रम लेते हैं, एक समूह पर जाँच चलाते हैं, और अंत में प्रमाणित कमी-निवारण व महारत बढ़त की रिपोर्ट देते हैं। पायलट के अंत में आप बाहर निकल सकते हैं और अपना डेटा ले जा सकते हैं।",
});
