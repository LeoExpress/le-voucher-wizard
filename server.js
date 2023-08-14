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



fastify.get("/voucherPreview", async function (request, reply) {

    const params = request.query;
    const { language = 'cs', amount = '1000', code = '000000000000' } = params;
    const currency = language === 'cs' ? 'Kč' : language === 'pl' ? 'zł' : '€';


    console.log('Creating PDF')
    const pdfDoc = await pdflib.PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const helveticaFont = await pdfDoc.embedFont(pdflib.StandardFonts.HelveticaBold)
    const timesRomanFont = await pdfDoc.embedFont(pdflib.StandardFonts.TimesRoman)
    const fontBytes = await fetch('https://cdn.glitch.global/928c0fcf-427b-4ef0-abe1-990d4bf24c1d/SanomatSans-Medium.otf?v=1672753420890').then(res => res.arrayBuffer())
    const customFont = await pdfDoc.embedFont(fontBytes)

    const page = pdfDoc.addPage()
    page.setSize(2598,1299)
    const { width, height } = page.getSize()
    const fontSize = 30


    console.log('Drawing image')
    const backgroundUrl = `${seo.url}/${language}_voucher.png`
    const backgroundImageBytes = await fetch(backgroundUrl).then((res) => res.arrayBuffer())
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

    console.log('Drawing text')
    page.drawText(`${amount.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${currency}`, {
        x: 115,
        y: 445,
        size: 165,
        font: customFont,
        color: pdflib.rgb(205/255, 135/255, 47/255),
    })

    console.log('Drawing text')
    page.drawText(`${code}`, {
        x: 2477,
        y: 350,
        size: 90,
        font: timesRomanFont,
        rotate: pdflib.degrees(90),
    })

    console.log('Saving PDF')
    const pdfBytes = await pdfDoc.save()
    const buf = Buffer.from(pdfBytes.buffer);
    reply
        .type('application/pdf')
        .send(buf)



})

fastify.get("/voucher", async function (request, reply) {

    const params = request.query;
    const { language = 'cs', amount = '1000', code = '000000000000' } = params;
    const currency = language === 'cs' ? 'Kč' : language === 'pl' ? 'zł' : '€';

    // Create ZIP from buffer
    const zip = new JSZip();

    for (const codeElement of code.split(',')) {
        console.log(codeElement);

        console.log('Creating PDF')
        const pdfDoc = await pdflib.PDFDocument.create()
        pdfDoc.registerFontkit(fontkit)
        const helveticaFont = await pdfDoc.embedFont(pdflib.StandardFonts.HelveticaBold)
        const timesRomanFont = await pdfDoc.embedFont(pdflib.StandardFonts.TimesRoman)
        const fontBytes = await fetch('https://cdn.glitch.global/928c0fcf-427b-4ef0-abe1-990d4bf24c1d/SanomatSans-Medium.otf?v=1672753420890').then(res => res.arrayBuffer())
        const customFont = await pdfDoc.embedFont(fontBytes)

        const page = pdfDoc.addPage()
        page.setSize(2598,1299)
        const { width, height } = page.getSize()
        const fontSize = 30


        console.log('Drawing image')
        const backgroundUrl = `${seo.url}/${language}_voucher.png`
        const backgroundImageBytes = await fetch(backgroundUrl).then((res) => res.arrayBuffer())
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

        console.log('Drawing text')
        page.drawText(`${amount.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${currency}`, {
            x: 115,
            y: 445,
            size: 165,
            font: customFont,
            color: pdflib.rgb(205/255, 135/255, 47/255),
        })

        console.log('Drawing text')
        page.drawText(`${codeElement}`, {
            x: 2477,
            y: 350,
            size: 90,
            font: timesRomanFont,
            rotate: pdflib.degrees(90),
        })

        console.log('Saving PDF')
        const pdfBytes = await pdfDoc.save()
        const buf = Buffer.from(pdfBytes.buffer);
        zip.file(`voucher_${codeElement}.pdf`, buf);
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

    const { amount, currency, code, language } = request.body;
    const url = `${seo.url}/voucher?amount=${amount}&code=${code}&language=${language}`;
    const urlPreview = `${seo.url}/voucherPreview?amount=${amount}&code=${code}&language=${language}`;
    viewParams = {amount, currency, code, language, url, urlPreview, ...viewParams};

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
    const backgroundImageBytes = await fs.readFileSync('./public/le_vizitka.pdf')
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
