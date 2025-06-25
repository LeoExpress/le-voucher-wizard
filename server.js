const path = require("path");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const pdflib = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit")
const Handlebars = require("handlebars");
const JSZip = require("jszip");
const fs = require("fs");

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
    // Set this to true for detailed logging:
    logger: false,
});

// ADD FAVORITES ARRAY VARIABLE FROM

// Setup our static files
fastify.register(require("@fastify/static"), {
    root: path.join(__dirname, "public"),
    prefix: "/", // optional: default '/'
});

// Formbody lets us parse incoming forms
fastify.register(require("@fastify/formbody"));

// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
    engine: {
        handlebars: Handlebars,
    },
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
    seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}


const textSubtitleMap = (language, classesText) => {
    const map = {
        cs: `Dárkový poukaz je platný pro třídu ${classesText}. Lze jej použít pro nákup jízdenek opakovaně až do vyčerpání jeho hodnoty. Číslo poukazu zadejte na webu le.cz v sekci Platba. Pro zjištění zůstatku se přihlaste do Vašeho Smile Club účtu a v sekci Moje leo kredity vyberte podsekci Kreditová banka, kam zadáte číslo poukazu. V případě problémů kontaktujte info@le.cz.`,
        en: `The gift voucher is valid for ${classesText} class. It can be used to purchase tickets repeatedly until its value is exhausted. Enter the voucher number on the website le.cz in the Payment section. To check your balance, log into your Smile Club account and select the Credit Bank subsection in the My leo credits section to enter the voucher number. If you have any problems, please contact info@le.cz`,
        pl: `Voucher upominkowy jest ważny w klasie ${classesText}. Może być wykorzystywany do wielokrotnego zakupu biletów aż do wyczerpania jego wartości. Wprowadź numer vouchera na stronie le.cz w sekcji Płatności. Aby sprawdzić saldo, zaloguj się na swoje konto Smile Club i wybierz podsekcję Bank kredytowy w sekcji Moje kredyty leo, aby wprowadzić numer vouchera. W razie jakichkolwiek problemów prosimy o kontakt info@le.cz.`,
        sk: `Darčeková poukážka platí pre ${classesText} triedu. Môžete ju použiť na nákup lístkov opakovane až do vyčerpania jej hodnoty. Číslo poukážky zadajte na webovej stránke leoexpress.sk v časti Platba. Ak chcete skontrolovať zostatok, prihláste sa do svojho účtu Smile Club a v časti Moje leo kredity vyberte podsekciu Kreditná banka a zadajte číslo poukazu. V prípade akýchkoľvek problémov kontaktujte info@le.cz.`,
        de: `Der Geschenkgutschein ist für die ${classesText} Klasse gültig. Er kann wiederholt für den Kauf von Fahrkarten verwendet werden, bis sein Wert erschöpft ist. Geben Sie die Gutscheinnummer auf der Website le.cz im Abschnitt Zahlung ein. Um Ihr Guthaben zu überprüfen, loggen Sie sich in Ihr Smile-Club-Konto ein und wählen Sie in der Rubrik Meine leo-Gutschriften den Unterabschnitt Credit Bank, um die Gutscheinnummer einzugeben. Sollten Sie Probleme haben, wenden Sie sich bitte an info@le.cz`,
        ua: `Подарунковий ваучер дійсний для ${classesText} класу. Його можна використовувати для придбання квитків багаторазово, доки не буде вичерпано його вартість. Введіть номер ваучера на сайті le.cz у розділі Оплата. Щоб перевірити баланс, увійдіть до свого облікового  запису Smile Club і виберіть підрозділ Кредитний банк у розділі Мої кредити leo, щоб ввести номер ваучера.  Якщо у вас виникли проблеми, будь ласка, зверніться за адресою info@le.cz.`,
        cn: `The gift voucher is valid for ${classesText} class. It can be used to purchase tickets repeatedly until its value is exhausted. Enter the voucher number on the website le.cz in the Payment section. To check your balance, log into your Smile Club account and select the Credit Bank subsection in the My leo credits section to enter the voucher number. If you have any problems, please contact info@le.cz`,
        hu: `Az ajándékutalvány ${classesText} osztályra érvényes. Többször is felhasználható jegyek vásárlására, amíg az értéke el nem fogy. Adja meg az utalvány számát a le.cz weboldalon a Fizetés rovatban. Az egyenleg ellenőrzéséhez jelentkezzen be Smile Club fiókjába, és a My leo kreditek résznél válassza a Hitelbank alfejezetet, ahol adja meg az utalvány számát. Ha bármilyen problémája van, kérjük, forduljon a info@le.cz címre.`,

    }
    return map[language]
}


    const createPDF = async (language, amount, classes, code,deleted_at_submit = '',pln=0,eur=0) => {
    const currency = language === 'cs' ? 'Kč' : language === 'pl' ? 'zł' : '€';

    let numAmount = Number(amount);
        // Úprava kurzu podle jazyka
        if (language === 'cs') {
           // numAmount = numAmount ; // Kč
        } else if (language === 'pl') {
            if (pln > 0) {
                numAmount= Math.round(numAmount / pln); // PLN
            }else {
                numAmount = Math.round(numAmount / 5); //zl pokud není kurz poslaný z levisu
            }
        } else {
            if (eur > 0) {
                numAmount = Math.round(numAmount / eur); // EUR
            }else {
                Math.round(numAmount = numAmount / 24); //eu
            }

        }

        // Zpět na řetězec
        amount =  parseFloat(numAmount.toFixed(2)).toString();


    console.log('Creating PDF')
    const pdfDoc = await pdflib.PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const helveticaFont = await pdfDoc.embedFont(pdflib.StandardFonts.HelveticaBold)
    const arialFont = await pdfDoc.embedFont(await fs.readFileSync('./public/font/Arial.otf'))
    const timesRomanFont = await pdfDoc.embedFont(pdflib.StandardFonts.TimesRoman)
    const fontBytes = await fs.readFileSync('./public/font/SanomatSans-Medium.otf')
    const fontRegularBytes = await fs.readFileSync('./public/font/SanomatSans-Regular.otf')
    const customFont = await pdfDoc.embedFont(fontBytes)
    const regularFont = await pdfDoc.embedFont(fontRegularBytes)

    const page = pdfDoc.addPage()
  //  if (language === 'hu') {
        page.setSize(2362, 1181); // nebo jiný rozměr specifický pro HU variantu
   /* } else {
        page.setSize(2598, 1299); // výchozí velikost pro ostatní
    }*/
    const { width, height } = page.getSize()
    const fontSize = 30


    console.log('Drawing image')
    //const backgroundUrl = `${seo.url}/${language}_voucher.png`
    //const backgroundImageBytes = await fetch(backgroundUrl).then((res) => res.arrayBuffer())

    // load image from filesystem
    const backgroundImageBytes = await fs.readFileSync(`./public/${language}_voucher.png`)


    const backgroundImage = await pdfDoc.embedPng(backgroundImageBytes)
    const backgroundDims = backgroundImage.scale(0.5)
    page.drawImage(backgroundImage, {
        x: 0,
        y: 0,
        width: backgroundImage.width,
        height: backgroundImage.height,
    })

    /*console.log('Drawing egg image')
    const humptyImageBytes = await fetch("https://static.wikia.nocookie.net/shrek/images/5/56/Humpty_Dumpty.png/revision/latest?cb=20111130083330").then((res) => res.arrayBuffer())
    const humptyImage = await pdfDoc.embedPng(humptyImageBytes)
    const humptyDims = humptyImage.scale(0.5)
    page.drawImage(humptyImage, {
        x: 2500,
        y: 0,
        width: 68,
        height: 100,
    })*/


    // determine classes based on language
    let classesArray = classes.split(',')

    // allow only valid classes (eco, ecoplus, bus, pre)
    classesArray = classesArray.filter((c) => ['eco', 'ecoplus', 'bus', 'pre'].includes(c))

    // if no valid classes, default to eco
    if (classesArray.length === 0) classesArray = ['eco']

    // rename classes based on language
    classesArray = classesArray.map((c) => {
        switch (c) {
            case 'eco':
                return 'Economy';
            case 'ecoplus':
                return 'Economy Plus';
            case 'bus':
                return 'Business';
            case 'pre':
                return 'Premium';
        }
    });

    // determine "or" text in languages
    let orMap = {
        cs: 'nebo',
        pl: 'lub',
        sk: 'alebo',
        de: 'oder',
        en: 'or',
        ru: 'или',
        ua: 'або',
        hu: 'vagy'
    }

    let classesText = classesArray.map((c, i) => {
        let text = ''
        if (i === 0) {
            text = c
        } else if (i === classesArray.length - 1) {
            text = ` ${orMap[language]} ${c}`
        } else {
            text = `, ${c}`
        }
        return text
    }).join('')




    const textSubtitle = textSubtitleMap(language, classesText)
   // if (language === 'hu') {
        page.drawText(textSubtitle, {
            x: 175,
            y: 135,
            size: 18,
            font: language !== 'ua' ? regularFont : arialFont,
            color: pdflib.rgb(87 / 255, 87 / 255, 87 / 255),
            lineHeight: 21,
            maxWidth: 880
        })



/*}else{
    page.drawText(textSubtitle, {
        x: 115,
        y: 243,
        size: 32,
        font: language !== 'ua' ? regularFont : arialFont,
        color: pdflib.rgb(87 / 255, 87 / 255, 87 / 255),
        lineHeight: 40,
        maxWidth: 1750
    })

    }*/
    console.log('Drawing text')
  //  if (language === 'hu') {
        page.drawText(`${amount.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${currency}`, {
            x: 170,
            y: 350,
            size: 165,
            font: customFont,
            color: pdflib.rgb(240 / 255, 130 / 255, 0 / 255),
        })
    /*}else {
        page.drawText(`${amount.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${currency}`, {
            x: 115,
            y: 445,
            size: 165,
            font: customFont,
            color: pdflib.rgb(205 / 255, 135 / 255, 47 / 255),
        })
    }*/
    console.log('Drawing text')
  //  if (language === 'hu') {
        page.drawText(`${code}`, {
            x: 175,                 // mírně zprava od levého okraje rámečku
            y: 180,                  // posun níže k dolnímu okraji rámečku
            size: 50,
            font: customFont, //timesRomanFont,
           // color: pdflib.rgb(205/255, 135/255, 47/255),
        });
    /*} else {
        page.drawText(`${code}`, {
            x: 2477,
            y: 350,
            size: 90,
            font: timesRomanFont,
            rotate: pdflib.degrees(90),
        });
    }*/
  //  if (language === 'hu') {
        page.drawText(`${deleted_at_submit}`, {
            x: 610,                 // mírně zprava od levého okraje rámečku
            y: 180,                  // posun níže k dolnímu okraji rámečku
            size: 50,
            font: customFont, //timesRomanFont,
            // color: pdflib.rgb(205/255, 135/255, 47/255),
        });
    //}
    console.log('Saving PDF')
    const pdfBytes = await pdfDoc.save({useObjectStreams: false})
    const buf = Buffer.from(pdfBytes.buffer);

    return buf
}


fastify.get("/voucherPreview", async function (request, reply) {

    const params = request.query;
    const { language = 'cs', amount = '1000', classes = 'eco,ecoplus,bus,pre', code = '000000000000',deleted_at_submit = '',pln=0,eur=0 } = params;

    const pdfBuffer = await createPDF(language, amount, classes, code,deleted_at_submit,pln,eur)

    reply
        .type('application/pdf')
        .send(pdfBuffer)



})

fastify.get("/voucher", async function (request, reply) {

    const params = request.query;
    const { language = 'cs', amount = '1000', classes = 'eco,ecoplus,bus,pre', code = '000000000000',deleted_at_submit = '', pln=0,eur=0} = params;

    // Create ZIP from buffer
    const zip = new JSZip();

    for (const codeElement of code.split(',')) {
        const pdfBuffer = await createPDF(language, amount, classes, codeElement,deleted_at_submit,pln,eur )
        zip.file(`voucher_${codeElement}.pdf`, pdfBuffer);
    }



    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });


    reply
        .type('application/zip')
        .send(zipBuffer)
})

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/", function (request, reply) {
    // params is an object we'll pass to our handlebars template
    let params = { seo: seo };

    // If someone clicked the option for a random color it'll be passed in the querystring
    if (request.query.randomize) {
        // We need to load our color data file, pick one at random, and add it to the params
        const colors = require("./src/colors.json");
        const allColors = Object.keys(colors);
        let currentColor = allColors[(allColors.length * Math.random()) << 0];

        // Add the color properties to the params object
        params = {
            color: colors[currentColor],
            colorError: null,
            seo: seo,
        };
    }

    // The Handlebars code will be able to access the parameter values and build them into the page
    return reply.view("/src/pages/index.hbs", params);
});

/**
 * Our POST route to handle and react to form submissions
 *
 * Accepts body data indicating the user choice
 */
fastify.post("/", function (request, reply) {
    // Build the params object to pass to the template
    let viewParams = { seo: seo };

    const { amount, currency, code, language, classes,deleted_at_submit = '' ,pln=0,eur=0} = request.body;

    const url = `${seo.url}/voucher?amount=${amount}&code=${code}&language=${language}&classes=${classes}&deleted_at_submit=${deleted_at_submit}&pln=${pln}&eur=${eur}`;
    const urlPreview = `${seo.url}/voucherPreview?amount=${amount}&code=${code}&language=${language}&classes=${classes}&deleted_at_submit=${deleted_at_submit}&pln=${pln}&eur=${eur}`;
    viewParams = {amount, currency, code, language, url, urlPreview, classes, deleted_at_submit,pln,eur, ...viewParams};

    console.log(viewParams)
    // The Handlebars template will use the parameter values to update the page with the chosen color
    return reply.view("/src/pages/index.hbs", viewParams);
});







fastify.get("/vizitkyPreview", async function (request, reply) {

    const params = request.query;
    const {
        name = 'Leona Měšťánková',
        job = 'business development analyst',
        job2 = ' ',
        phone = '+420 702 141 034',
        email = 'leona.mestankova@le.cz',
        web = 'leoexpress.com',
        address = 'orlicko',
        back = 'app'

    } = params;


    console.log('Creating PDF')
    const pdfDoc = await pdflib.PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const mediumFont = await pdfDoc.embedFont(await fs.readFileSync('./public/font/SanomatSans-Medium.otf'))
    const regularFont = await pdfDoc.embedFont(await fs.readFileSync('./public/font/SanomatSans-Regular.otf'))

    const page = pdfDoc.addPage()
    page.setSize(313.47,214.26)


    console.log('Drawing image')
    const backgroundImageBytes = await fs.readFileSync('./public/le_vizitka_new.pdf')
    const [backgroundImage] = await pdfDoc.embedPdf(backgroundImageBytes)
    page.drawPage(backgroundImage)

    console.log('Drawing text')
    page.drawText(`${name}`, {
        x: 46,
        y: 99.7,
        size: 11,
        font: mediumFont,
        color: pdflib.cmyk(0, 0, 0, 1),
    })

    page.drawText(`${job}`, {
        x: 46,
        y: 88.8,
        size: 7,
        font: regularFont,
        lineHeight: 9,
        color: pdflib.cmyk(0, 0.6, 1, 0),
    })

    page.drawText(`${job2}`, {
        x: 46,
        y: 78.8,
        size: 7,
        font: regularFont,
        lineHeight: 9,
        color: pdflib.cmyk(0, 0.6, 1, 0),
    })


    const smallTextArgs = {
        size: 6.7,
        font: regularFont,
        lineHeight: 9,
        color: pdflib.cmyk(0, 0,0, 1),
    };

    page.drawText(`${phone}`, { x: 46, y: 61.8, ...smallTextArgs })
    console.log('phone', phone)
    page.drawText(`${email}`, { x: 46, y: 51.8, ...smallTextArgs })

    if(address === 'praha') {
        page.drawText(`Řehořova 908/4`, { x: 220, y: 71.8, ...smallTextArgs })
        page.drawText(`130 00 Praha 3`, { x: 225, y: 61.8, ...smallTextArgs })
        page.drawText(`Česká republika`, { x: 221, y: 51.8, ...smallTextArgs })
    }
    if(address === 'bohumin') {
        page.drawText(`Ad. Mickiewicze`, { x: 221, y: 71.8, ...smallTextArgs })
        page.drawText(`735 81 Bohumín`, { x: 223, y: 61.8, ...smallTextArgs })
        page.drawText(`Česká republika`, { x: 221, y: 51.8, ...smallTextArgs })
    }
    if(address === 'orlicko') {
        page.drawText(`Nádraží 395`, { x: 233, y: 71.8, ...smallTextArgs })
        page.drawText(`561 69 Králíky`, { x: 228, y: 61.8, ...smallTextArgs })
        page.drawText(`Česká republika`, { x: 221, y: 51.8, ...smallTextArgs })

        page.drawText(`Leo Express Tenders s. r. o.`, { x: 46, y: 41.8, ...smallTextArgs })
    }
    if(address === 'plzen') {
        page.drawText(`Kaltovská tř. 5/7`, { x: 220, y: 71.8, ...smallTextArgs })
        page.drawText(`301 00 Plzeň`, { x: 231, y: 61.8, ...smallTextArgs })
        page.drawText(`Česká republika`, { x: 221, y: 51.8, ...smallTextArgs })
    }
    if(address === 'slovensko') {
        page.drawText(`Pražská 11`, { x: 239, y: 71.8, ...smallTextArgs })
        page.drawText(`811 04 Bratislava`, { x: 220.5, y: 61.8, ...smallTextArgs })
        page.drawText(`Slovensko`, { x: 237.8, y: 51.8, ...smallTextArgs })
    }

    page.drawText(`${web}`, {
        x: (web === 'le.cz') ? 246: 192.5,
        y: 145.5,
        size: 10.5,
        font: mediumFont,
        color: pdflib.cmyk(0, 0.6, 1, 0),
    })




    console.log('Saving PDF')
    const pdfBytes = await pdfDoc.save()
    const buf = Buffer.from(pdfBytes.buffer);
    reply
        .type('application/pdf')
        .send(buf)


})

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/vizitky", function (request, reply) {
    // params is an object we'll pass to our handlebars template
    let params = { seo: seo };

    // The Handlebars code will be able to access the parameter values and build them into the page
    return reply.view("/src/pages/vizitky.hbs", params);
});

/**
 * Our POST route to handle and react to form submissions
 *
 * Accepts body data indicating the user choice
 */
fastify.post("/vizitky", function (request, reply) {
    // Build the params object to pass to the template
    let viewParams = { seo: seo };

    const { name, job, job2,  phone,  email,  web,  address, back } = request.body;
    //const urlPreview = `${seo.url}/vizitkyPreview?name=${name}&job=${job}&phone=${phone}&email=${email}&web=${web}&address=${address}&job2=${job2}&back=${back}`;
    const urlPreview = `${seo.url}/vizitkyPreview?name=${encodeURIComponent(name)}&job=${encodeURIComponent(job)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&web=${web}&address=${address}&job2=${encodeURIComponent(job2)}&back=${back}`;
    var urlBack = `${seo.url}/zadni_corporate.pdf`;
    if (back === 'plot') {
        urlBack = `${seo.url}/zadni_plot.pdf`;
    } else if (back === 'corporate') {
        urlBack = `${seo.url}/zadni_corporate.pdf`;
    } else if (back === 'app') {
        urlBack = `${seo.url}/zadni_app.pdf`;
    } else if (back === 'cestujte_cz') {
        urlBack = `${seo.url}/zadni_cestujte_cz.pdf`;
    } else if (back === 'cestujte_sk') {
        urlBack = `${seo.url}/zadni_cestujte_sk.pdf`;
    } else if (back === 'inzerce') {
        urlBack = `${seo.url}/zadni_inzerce.pdf`;
    }


    viewParams = {name, job, job2, phone,  email,  web,  address, back, url: urlPreview, urlPreview, urlBack, ...viewParams};

    console.log(viewParams)
    // The Handlebars template will use the parameter values to update the page with the chosen color
    return reply.view("/src/pages/vizitky.hbs", viewParams);
});


// Run the server and report out to the logs
fastify.listen(
    { port: process.env.PORT || 8080, host: '0.0.0.0' },
    function (err, address) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Your app is listening on ${address}`);
    }
);


const test = async () => {
    const pdfDoc = await pdflib.PDFDocument.create()
    const timesRomanFont = await pdfDoc.embedFont(pdflib.StandardFonts.Helvetica)

    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const fontSize = 30
    page.drawText('Creating PDFs in JavaScript is awesome!', {
        x: 50,
        y: height - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
        color: pdflib.rgb(0, 0.53, 0.71),
    })

    const pdfBytes = await pdfDoc.save()


}

test()
