const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
var session = require('express-session');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator')
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
require('dotenv').config();
app.use(session({
    secret: process.env.SECRET, 
    name: process.env.NAME
    , saveUninitialized: false
}));


//database connections

mongoose.connect("mongodb+srv://naksh160201:"+process.env.DB_PASS+"@nakshatracluster.qrbdl.mongodb.net/TravelSaathiDB?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.set("useCreateIndex", true);

//user schema
const usersSchema = new mongoose.Schema({
    name: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
});


const User = new mongoose.model("User", usersSchema);



//nodemailer transporter
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user:process.env.TS_U,
        pass:process.env.TS_P 
    }
});


//routes
app.get('/',(req,res)=>{
    
    if(!req.session.loggedIn)
    res.render('login');
    else
    res.send("already logged in .. logout using /logout");
})

app.post('/authenticate', (req, res) => {
    User.findOne({ email: req.body.username }, function (err, found) {
        if (err) {
            console.log(err);
        }
        else {
            if (found) {
                if (found.password === req.body.password) {
                    req.session.loggedIn = true;
                    req.session.username = req.body.username;
                    res.send("logged in");
                    //res.redirect('/');
                }
                else {
                    res.send("wrong pass");
                }
            }
            else {
                res.send("register yourself");
            }
        }
    });
});


app.get('/forgot', (req, res) => {
    if(!req.session.loggedIn)
    res.render('forgotpassword');
});

app.post('/reset', (req, res) => {

    User.findOne({ email: req.body.username }, function (err, found) {
        if (err) {
            console.log(err);
        }
        else {
            if (found) {
                found.resetPasswordToken = String(otpGenerator.generate(6));
                found.resetPasswordExpires = Date.now() + 300000; // 5 min in ms
                found.save(function (err) {
                    if (!err) {
                        console.log("saved success");
                    }
                    else {
                        res.send('try later ');
                    }
                });



                var mailOptions = {
                    from: 'travelsaathi21@gmail.com',
                    to: found.email,
                    subject: 'Password reset for travelsaathi.com',
                    text: 'Someone requested to change the password for travelsaathi.com account with username: ' + found.email + ' .If it wasnt you then dont worry ,your password will remain unchanged. Dont share this OTP with anyone . This OTP will remain valid for 5 minutes OTP: ' + found.resetPasswordToken
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        req.session.forgotuname = found.email;
                        console.log('Email sent: ');
                        res.render('OTP');
                    }
                });
            }
            else {
                res.send("not registered");
            }
        }
    });

});

app.post('/checkotp', (req, res) => {

    User.findOne({ email: req.session.forgotuname }, function (err, found) {
        if (err) {
            console.log(err);
        }
        else {
            if (found) {
                if (found.resetPasswordToken === req.body.otp && found.resetPasswordExpires > Date.now()) {
                    found.password = req.body.passw;

                    found.save(function (err) {
                        if (!err) {
                            console.log("saved success");

                            var mailOptions = {
                                from: 'travelsaathi21@gmail.com',
                                to: req.session.forgotuname,
                                subject: 'Password changed successfully',
                                text: 'Your password was changed successfully.'
                            };

                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    req.session.forgotuname = found.email;
                                    console.log('Email sent: ' + info.response);
                                    res.redirect('/');
                                }
                            });
                            
                        }
                        else {
                            res.send('wrong otp');
                        }
                    });
                }
                else {
                    res.send('ERROR 404');
                }
            }
            else {
                res.send("no such user");
            }
        }
    });

});

app.get('/logout', (req, res) => {
    //req.session.destroy((err)=>{})
    req.session.loggedIn = false;
    //res.send('Thank you! Visit again')
    res.redirect('/');
});
// app.get('/adder',(req, res)=>{
//     const ele = new Ele({
//         topic: "algebra",
//         subtopic:"operations",
//         tid: "2",
//     });
//     ele.save();


// });


app.post('/signup', (req, res) => {

    User.findOne({ email: req.body.email }, function (err, found) {
        if (err)
            console.log(err);
        else {
            if (!found) {
                
                    const user = new User({
                        name: req.body.name,
                        gender: req.body.gender,
                        email: req.body.email,
                        password: req.body.psw,
                        phone: req.body.phone
                    });
                    user.save(function (err) {
                        if (!err) {

                            var mailOptions = {
                                from: 'travelsaathi21@gmail.com',
                                to: req.body.email,
                                subject: 'Successful registration with travelsaathi.com',
                                text: 'Congrats! you are successfully registered with username ' + req.body.email
                            };

                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log('Email sent: ' + info.response);
                                    res.redirect('/');
                                }
                            });
                            
                        }
                        else {
                            res.send('fail');
                        }
                    });
                
            }
            else {
                res.send("username taken");
            }
        }
    });
});
 
app.listen(process.env.PORT || 3000, function () {
    console.log("Started");
})
