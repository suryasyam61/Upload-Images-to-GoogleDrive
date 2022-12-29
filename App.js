const { google } = require('googleapis');
var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var multer = require('multer');
const path = require('path')
const fs = require('fs')
var GoogleDrive = require('./Model-Images');
var GoogleDate = require('./Model-Dates');
const MongoClient = require('mongodb').MongoClient
require('dotenv/config');
const cors = require('cors');
const cluster = require('node:cluster');
var validateDate = require("validate-date");
const BSON = require("bson");
const localport=3300;


//Use Method 
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cors({
    origin: '*'
}));

const url = 'mongodb+srv://Vishesh:Vishesh@cluster0.evghetg.mongodb.net/?retryWrites=true&w=majority'
const config = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true

}


//Mongoose connection -----------------------------------------------------------
mongoose.connect(url, {}, config).then(() => {
    console.log("Mongosse connected")
}).catch(err => { console.log(err.message) })



//Client Connection  -------------------------------------------------------------
const client = new MongoClient('mongodb+srv://Vishesh:Vishesh@cluster0.evghetg.mongodb.net/?retryWrites=true&w=majority')


//*****************************************************************Google Drive Details and Connections******************************************************************* */
// Details of GoogleDrive----------------------------------------------------------

const CLIENT_ID = '193010531547-h2rnjj8iskcdjr05cq8uptrf6gtsfjq4.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URL = 'https://developers.google.com/oauthplayground';

const REFRESH_TOKET = '1//04mKgTDKBE7N0CgYIARAAGAQSNwF-L9Ir9QspQgFzsksz3ImuCY-cl8wZcNKRmL0KYU5K1U_Zs3cXb54-kIKrGCeuv8BtWd3HGaE'



//oauth2Client----------------------------------------------------------
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKET })



// Connections of Google Drive----------------------------------------------------
const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
})

//****************************************************************Google Drive Details and Connections******************************************************************** */


//Store images using multer -------------------------------------------------------
const Storage = multer.diskStorage({
    destination: (req, file, cb) => {

        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + ".png")
    }
});



// Decliere Images Function
const upload = multer({ storage: Storage });



//Get method-----------------------------------------------------------------------
app.get('/', async (req, res) => {
    //console.log("worker start")
    all = []
    all.length = 0

    // date setting and createimage try and catch method--------------------
    try {

        //dates getting starting and latest ------------------------------------------
        const Dates = await GoogleDate.find()
        const start = Dates[0].StartDate;
        const last = Dates[0].LatestDate;

        var sd = new Date(start.getFullYear(), start.getMonth(), 2)
        var ld = new Date(last.getFullYear(), last.getMonth(), 2)

        //creating dates individula month starting and ending--------------------------------
        for (let index = 0; ld >= sd; ld.setMonth(ld.getMonth() - 1)) {

            const fullmonth = ld.toLocaleString('default', { month: 'long' });
            folderdate = `${fullmonth}-${ld.getFullYear()}`

            gsd = new Date(ld.getFullYear(), ld.getMonth(), 2)
            gld = new Date(ld.getFullYear(), ld.getMonth() + 1, 0)

            gsd.setDate(gsd.getDate() - 1)
            gld.setDate(gld.getDate() + 2)

            // calling Create images function -------------------------------------------------------------
            await createimages();
        }

    } catch (err) {
        console.log(err.message)
    } finally {
        //finally return res.send data
        return res.status(200).send(all)
    }

    // this function getting images using date filter throw Mongodb
    async function createimages() {
        //creating folder using year and month
        try {
            //getting data using find method
            alldata = await find();

            //creating api's and decoding images
            obj = await decode_and_api(alldata);

        } catch (err) {
            console.log(err.message)
        } finally {
            //pulling data in "all" array
            await all.push(obj);
        }
    }

    //getting data using find method
    async function find() {
        try {

            allData = await GoogleDrive.find({
                "Date": {
                    $gte: (gsd),
                    $lt: (gld),
                }
            })
            return allData
        } catch (err) {
            console.log(err)
        }

    }

    //creating api's and decoding images
    async function decode_and_api(alldata) {
        monthname = ""
        var urls = []
        var obj = {}
        var da = {}
        await alldata.forEach(async data => {

            //creating api
            da = { src: `https://drive.google.com/uc?export=view&id=${data.image}`, id: data._id }
            //console.log(da)
            urls.push(da)

        });

        //assain data in "obj" object
        obj = [{
            monthname: folderdate,
            Imageurls: urls
        }]
        return obj
    }

});



//Post Method--------------------------------------------------------------------------
app.post('/upload', upload.array('Image', 20), async (req, res, next) => {

    //console.log(req.body.Date);
    udate = new Date(req.body.Date)
    //console.log(udate);

    await find_and_set_dates();

    await dataupload(req, res);
    return res.send("Successfully uploaded")

    // update the MongoDB Date depending on what you got a date through the user
    async function find_and_set_dates() {
        try {
            Dates = await GoogleDate.find()


            if (Dates.length < 1) {
                try {
                    const da = new GoogleDate({
                        name: "yes",
                        LatestDate: udate,
                        // LatestDate: Date.now(),
                        StartDate: udate,
                        //StartDate: Date.now(),
                    })
                    da.save().then().catch(err => console.log(err))
                } catch (err) {
                }
            } else {

                if (udate > Dates[0].LatestDate) {

                    await client.db("test").collection("googledates").updateOne({ name: 'yes' }, { $set: { LatestDate: udate } });
                } else {



                    await client.db("test").collection("googledates").updateOne({ name: 'yes' }, { $set: { LatestDate: Dates[0].LatestDate } });
                }



                // await client.db("test").collection("ldate_sdates").updateOne({ name: 'yes' }, { $set: { LatestDate: Date.now() } });
                if (udate < Dates[0].StartDate) {
                    await client.db("test").collection("googledates").updateOne({ name: 'yes' }, { $set: { StartDate: udate } });
                }
            }
        } catch (err) {
            console.log(err.message)
        }
    }

    // upload images in GoogleDrive and Mongodb-------------------------------------------------
    async function dataupload(req, res) {

        await req.files.forEach(file => {

            process(file);
        })


        async function process(file) {

            const id = await google(file);
          
            await encoding(id);
            await mongo(id,file);
        }

        // this is storage of GoogleDrive
        async function google(file) {

            try {

                const response = await drive.files.create({
                    requestBody: {
                        name: file.filename,
                        MimeType: 'image.jpg'
                    },
                    media: {
                        mimetype: 'image/jpg',
                        body: fs.createReadStream(path.join(__dirname + '/uploads/' + file.filename))
                    }
                })

                //console.log(response.data);

                return response.data.id

            } catch (error) {
                console.log(error.message);

            }
        }

        // this is encoding GoogleDrive Images
        async function encoding(id) {
            await drive.permissions.create({
                fileId: id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            })

            // // this is get golbel-user-links and download-links/////
            // const result = await drive.files.get({
            //     fileId: fileId,
            //     fields: 'webViewLink, webContentLink',
            // });

        }

        // this is GoogleDrive id is storing to Mongodb
        async function mongo(id,file) {
            try {
                const newImage = await new GoogleDrive({

                    name: file.fieldname + '-' + Date.now(),
                    image: id,
                    Date: req.body.Date
                });
                newImage.save().then().catch(err => console.log(err))

            } catch (err) {
                console.log(err)
            }
        }


        // remove uploads folder image data-----------------------------------------------------------------
        fs.rm(path.join(__dirname, 'uploads'), { recursive: true }, () => {
            // console.log("Folder Deleted!");
            fs.mkdir(path.join(__dirname, 'uploads'),
                { recursive: true,
                 }, (err) => {
                    if (err) {
                        return console.error(err);
                    }else{
                        fs.writeFile(path.join(__dirname,'uploads/dammy.txt'), 'this is dammy file', function (err) {
                            if (err) throw err;
                           // console.log('File is created successfully.');
                          });
                    }
                    //console.log('Directory created successfully!');
                });
        })

    }

});



// Delete Method-------------------------------------------------------------------------
app.delete('/Delete/:id', async (req, res) => {
    ///console.log(req.params.id);

    if (req.params.id) {
        await getbyid(req.params.id)
        await Mongodelete(req.params.id)
    }
    else
        res.send("please enter id")

    // this is get driveid details from mongodb-------------------------------------

    async function getbyid(id) {
        await GoogleDrive.findById(BSON.ObjectId(id))
            .then(doc => {
                Drivedelete(doc.image);
            })
            .catch(err => {
                console.log(err);
            });

    }

    // this is GoogleDrive data delete function------------------------------------

    async function Drivedelete(id) {
        try {

            const response = await drive.files.delete({
                fileId: id
            })
            console.log(response.data, response.status);
        } catch (error) {
            console.log(error.message);
        }

    }

    // this is mongodb data delete function--------------------------------------

    async function Mongodelete(id) {
        try {

            allData = await GoogleDrive.deleteOne({ "_id": BSON.ObjectId(id) })
            if (allData.deletedCount)
                res.send("deleted")
            else
                res.send("please enter correct id")
        } catch (err) {
            console.log(err)
        }
    }

})



app.get('/dammy', async (req, res) => {

    // GoogleDrive.findById(BSON.ObjectId("637af56240381b4dd73d9bdb"))
    //     .then(doc => {
    //         console.log(doc.image);
    //     })
    //     .catch(err => {
    //         console.log(err);
    //     });
    return res.send("reloded")
})



//Listen Port-----------------------------------------------------------------------
//const WORKERS = process.env.WEB_CONCURRENCY || 5;
if (cluster.isMaster) {
    for (var i = 0; i < 5; i++) {
        cluster.fork();
    }

    cluster.on('online', function (worker) {
        //console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function (worker, code, signal) {
        //console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        //console.log('Starting a new worker');
        cluster.fork();
    });

} else {
    app.listen(process.env.PORT || localport, err => {
        if (err)
            throw err
        console.log('Server listening on port', localport)
    })
}

