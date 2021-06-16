/********************* Configuracion CORS *********************/
var cors = require('cors');
var corsOptions = {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204
}
/********************* Configuracion JTW *********************/
const jwt = require('jwt-simple');
const { thomsonCrossSectionDependencies } = require('mathjs');
const secretKey = "miClaveSecreta"; // clave de cifrado del token
const algorithm = "HS256"; // algoritimo cifrado del token
const expire = 24 * 60 * 60 * 1000; // Tiempo de expiracion en Milisegundos
/********************* Configuracion MySQL *********************/
const mysql = require("mysql");
var connectionDB = mysql.createConnection({
//    host: "tfm.cc3qpfj5ctbv.eu-west-3.rds.amazonaws.com",
    host: "localhost",
    user: "admin",
    password: "Felipe123",
    port: "3306",
    database: "tfm"
});
connectionDB.connect(function(err) {
    if (err) {
        console.log("Error contectado a la base de datos", err);
        return;
    }
    console.log("Base de datos conectada");

/********************* EXPRESS *********************/
    const express = require("express");
    var app = express(); // crear la aplicacion express
    app.use("/", express.json({ strict: false })); // datos de body en JSON
 /********************* LOG's *********************/      
    var logger = require("./logger").Logger;

    /********************* WEB SOCKET *********************/
  /*  const serverPort = 3300,
        http = require("http"),

        server = http.createServer(app),
        WebSocket = require("ws"),
        websocketServer = new WebSocket.Server({ server });

    //when a websocket connection is established
    websocketServer.on('connection', (webSocketClient) => {
        //send feedback to the incoming connection
        webSocketClient.send('{ "connection" : "ok"}');

        //when a message is received
        webSocketClient.on('message', (message) => {
            console.log(`Received message => ${message}`)
            //for each websocket client
            websocketServer
                .clients
                .forEach(client => {
                    //send the client the current message
                    client.send(message);
                });
        });
    });

    //start the web server
    server.listen(serverPort, () => {
        console.log(`Websocket server started on port ` + serverPort);
    });
*/

    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ port: 3300 });

    wss.on('connection', function connection(ws) {
      ws.on('message', function incoming(data) {
        console.log(`Received message => ${data}`)
        logger.info(`Received message => ${data}`);
       // ws.send('Server ON');
        wss.clients.forEach(function each(client) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      });
    });

/******************** BUSCAR Y ACTUALIZA BASE DE DATOS CON IP  ******************/
require('dns').lookup(require('os').hostname(), function (err5, ip, fam) {
    console.log('addr: ' + ip);
    if (err5){
        console.log("Error al buscar ip" + err5);
        logger.error("Error al buscar ip" + err5);
    }
    var serverName = 'AWS';
    var sql = "UPDATE servers SET ip = " + mysql.escape(ip) + " WHERE (serverName = " + mysql.escape(serverName) + ");"
        console.log(sql);
        connectionDB.query(sql, function(error, server) {
            if (error){
                console.log("Error al grabar IP en la base de datos" + error);
                logger.error("Error al grabar IP en la base de datos" + error);
            }
            //            console.log(' OK Servidor 200' + JSON.stringify(server));
        });
  });

/********************* HEADERS *********************/
    app.all("/", function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        next();
    });

/********************* RAML *********************/
    const osprey = require("osprey");
    osprey.loadFile("./api.raml").then(function(middleware) { // cargar el API
        console.log("RAML cargado correctamente");
        logger.info("RAML cargado correctamente");
        app.use(cors())
        app.use("/api/v1/", middleware); // Analiza el api

        app.use(function(err1, req, res, next) { // Verificar si hay error en el API
            console.log("Error en el API:", err1);
            logger.error("Error en el API:", err1);
            res.status(err1.status).send("Error API. " + req.method + " " + req.url + ": " + JSON.stringify(err));
        });
        
        /********************* LOGIN *********************/
        // /api/v1/login/:email
        app.get("/api/v1/login/:email", cors(corsOptions), function(req, res) {
            var email = req.params.email;
            logger.info("login usuario email= ", email);
            connectionDB.query("SELECT * FROM usuario as usu WHERE usu.email = ?", [email], function(error, usuario) {
                if (error){
                    logger.error("Error login Usuario", error);
                    return res.status(500).send("Error obteniendo usuario");
                }                 
                if (usuario.length == 0){
                    logger.info("intento de Login usuario=", email);
                    return res.status(404).send("Error. usuario no encontrado");
                }
                res.status(200).json(usuario);
            });
        });

     /********************* Verificacion de usuario *********************/
        app.post("/api/v1/login", cors(corsOptions), function(req, res) {
            console.log("Busca usuarios");
            console.log(req.body);
            var email = req.body.email;
            var contrasena = req.body.contrasena;
            var sql = "SELECT usu.id FROM usuario as usu Where usu.email = " + mysql.escape(email) +  " and usu.contrasena = " +  mysql.escape(contrasena)+""
            console.log(sql);
         /********************* Login area *********************/
            connectionDB.query(sql, function(error, usuario) {
                if (error){
                    logger.error("Error obteniendo usuarios", error);
                    return res.status(500).send("Error obteniendo usuarios");
                }
                var userId = usuario;
               
                if (usuario.length == 0 ){
                    logger.error("Error usuarios o contraseña");
                    return res.status(401).send("Error usuario o contraseña");
                }
                var payload = {
                    iss: userId,
                    exp: Date.now() + expire
                };
                var token = jwt.encode(payload, secretKey, algorithm);
                logger.debug("Generado Token= ", token);
                res.status(200).json(token);
            });
       });

        /********************* Control de Usuarios *********************/
        app.get("/api/v1/usuario", cors(corsOptions), function(req, res) {
            console.log("Dentro de buscar usuarios");
            connectionDB.query("SELECT * FROM usuario", function(error, usuario) {
                if (error) return res.status(500).send("Error obteniendo usuarios");
                res.status(200).json(usuario);
            });
        });
        app.post("/api/v1/usuario", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var id = req.body.id;
            var email = req.body.email;
            var contrasena = req.body.contrasena;
            var tipo =  req.body.tipo;
            var nombre = req.body.nombre;
            var apellido = req.body.apellido;

            var sql = "INSERT INTO usuario ( email, contrasena, tipo, nombre, apellido) VALUES (" + mysql.escape(email) + "," + mysql.escape(contrasena) + "," + mysql.escape(tipo) + "," + mysql.escape(nombre) + "," + mysql.escape(apellido) + ");"
            
            connectionDB.query(sql, function(error, usuario) {
                console.log(error);
                if (error) return res.status(500).send("Error crear usuario" + error);
                res.status(200).json(usuario);
            });
        });
        app.put("/api/v1/usuario", cors(corsOptions), function(req, res) {
            console.log(req.body);
            console.log(req.body);
            var id = req.body.id;
            var email = req.body.email;
            var contrasena = req.body.contrasena;
            var tipo =  req.body.tipo;
            var nombre = req.body.nombre;
            var apellido = req.body.apellido;
    
            var sql ="UPDATE usuario SET email = " + mysql.escape(email) + ','
             + " contrasena = " +  mysql.escape(contrasena) + ',' + " tipo = " + mysql.escape(tipo) + ','
              + " nombre = " +  mysql.escape(nombre) + ',' + " apellido = " +  mysql.escape(apellido)
               + " WHERE (id = " + mysql.escape(id) + ");"            
            console.log(sql);
            connectionDB.query(sql, function(error, resp) {
                if (error) return res.status(500).send(error);
                res.status(200).json(resp);
            });
        });
        app.delete("/api/v1/usuario/:id", cors(corsOptions), function(req, res) {
            var id = req.params.id;
            console.log("id para borrar = ", id);
            connectionDB.query("DELETE FROM usuario WHERE (id ='" + id + "');", function(error, usuario) {
                if (error) return res.status(500).send("Error al borrar usuario con id = " + id + "," + error);
                res.status(200).json(usuario);
            });
        });
        app.get("/api/v1/usuario/:email", cors(corsOptions), function(req, res) {
            var email = req.params.email;
            console.log("GET Usuario con email= ", email);
            connectionDB.query("SELECT * FROM usuario WHERE (email ='" + email + "');", function(error, usuario) {
                if (error) return res.status(500).send("Error obteniendo usuarios");
                res.status(200).json(usuario);
            });
        });
 
        /********************* Mostra todos equipos Android *********************/
        app.get("/api/v1/equipo", cors(corsOptions), function(req, res) {

            connectionDB.query("SELECT * FROM equipo", function(error, equipo) {
                if (error) return res.status(500).send("Error obteniendo equipos");
                res.status(200).json(equipo);            
                });           
        });

        /********************* Crea Nuevo Equipo Android FRONT Y APP *********************/
        app.post("/api/v1/equipo", cors(corsOptions), function(req, res, next) {
            console.log(req.body);
            var serial = req.body.serialNumber;

            var sql = "INSERT INTO equipo (serialNumber, onoff, accion, horaInicio, horaFinal) VALUES (" +
             mysql.escape(serial) + ", '0', '0', '0', '0' );"      
            connectionDB.query(sql, function(error, equipo) {
                console.log(error);
                if (error) {
                    return res.status(500).send("Error al crear equipo");
                } 
     //           return res.status(200).json(equipo);
                next();
            });        
        });
        app.post("/api/v1/equipo", cors(corsOptions), function(req, res) {
            var serial = req.body.serialNumber;
            var emailCliente = req.body.emailCliente;
            var lastConn = req.body.lastConn;
            var sql2 = "INSERT INTO infoequipo (serialNumber, emailCliente, lastConn) VALUES (" +
             mysql.escape(serial) + "," + mysql.escape(emailCliente) + "," + mysql.escape(lastConn) + ");"      
            connectionDB.query(sql2, function(error, resp) {
                console.log(error);
                if (error) {
                     return res.status(500).send("Error al crear equipo en infoequipo");
                }else {
                    return res.status(200).json(resp);
     //               return res.redirect('/');
                }
            });
        });
       /********************* Actualiza Equipo Android *********************/
       app.put("/api/v1/equipo", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var serial = req.body.serialNumber;
            var onoff = req.body.onoff;
            var accion = req.body.accion;
            var horaInicio = req.body.horaInicio;
            var horaFinal = req.body.horaFinal;

            var sql = "UPDATE equipo SET onoff = " + mysql.escape(onoff) + ',' +
              " accion = " + mysql.escape(accion) + ',' +  " horaInicio = " + mysql.escape(horaInicio) +
              ',' + " horaFinal = " + mysql.escape(horaFinal) + " WHERE (serialNumber = " + mysql.escape(serial) + ");"
            console.log(sql);
            connectionDB.query(sql, function(error, equipo) {
                if (error) return res.status(500).send("Error actualizar equipo "+ error);
                res.status(200).json(equipo);
            });
        });

        /********************* Mostra un equipo Android especifico *********************/
        app.get("/api/v1/equipo/:serial", cors(corsOptions), function(req, res) {
            var serial = req.params.serial;
            console.log("Serial=" + serial);
            connectionDB.query("SELECT * FROM equipo WHERE serialNumber = ?", [serial], function(error, equipo) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo equipo");
                } 
                if (equipo.length == 0) return res.status(404).send("Error. Equipo no encontrado");
                res.status(200).json(equipo);
            });
        });
        app.delete("/api/v1/equipo/:serial", cors(corsOptions), function(req, res) {
            var serial = req.params.serial;
            console.log(" borrar serial= ", serial);
            connectionDB.query("DELETE FROM equipo WHERE (serial ='" + serial + "');", function(error, equipo) {
                if (error) return res.status(500).send("Error al borrar equipo= " + serial + "," + error);
                res.status(200).json(equipo);
            });
        });

        /*>>>******************** INFORMACION de EQUIPOS PARA FRONT END *******************<<<*/
        app.get("/api/v1/infoequipo", cors(corsOptions), function(req, res) {
            connectionDB.query("SELECT * FROM infoequipo", function(error, equipo) {
                if (error) return res.status(500).send("Error obteniendo devices");
                res.status(200).json(equipo);
            });
        });
        app.get("/api/v1/infoequipos/:emailCliente", cors(corsOptions), function(req, res) {
            var emailCliente = req.params.emailCliente;
            console.log("buscar InfoEquipos de= ", emailCliente)
            connectionDB.query("SELECT * FROM infoequipo WHERE emailCliente = ?", [emailCliente], function(error, equipo) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo equipo");
                } 
                if (equipo.length == 0) return res.status(404).send("Error. Equipo no encontrado");
                res.status(200).json(equipo);
            });
        });

        /**************POST NUEVO DEVICE desde FRONT-END ***************/
        app.post("/api/v1/infoequipo", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var serialNumber = req.body.serialNumber;
            var nombreEquipo = req.body.nombreEquipo;
            var sitio = req.body.sitio;
            var descripcion = req.body.descripcion;
            var emailCliente = req.body.emailCliente;
            var lastConn = req.body.lastConn;
            var sql = "INSERT INTO infoequipo (serialNumber, nombreEquipo, sitio, descripcion, emailCliente, lastConn) VALUES (" +
                mysql.escape(serialNumber) + "," + mysql.escape(nombreEquipo) + "," + mysql.escape(sitio) + "," + mysql.escape(descripcion) +
                "," + mysql.escape(emailCliente) + "," + mysql.escape(lastConn) + ");"

            console.log(sql);
            connectionDB.query(sql, function(error, resp) {
                if (error) return res.status(500).send(error);
                res.status(200).json(resp);
            });
        });
        app.put("/api/v1/infoequipo", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var serialNumber = req.body.serialNumber;
            var nombreEquipo = req.body.nombreEquipo;
            var descripcion = req.body.descripcion;
            var emailCliente = req.body.emailCliente;
            var lastConn = req.body.lastConn;
            var sql ="UPDATE infoequipo SET nombreEquipo = " + mysql.escape(nombreEquipo) + ',' +
             " descripcion = " +  mysql.escape(descripcion) + ',' +
              " emailCliente = " +  mysql.escape(emailCliente) +  ',' + " lastConn = " +  mysql.escape(lastConn) +
               " WHERE (serialNumber = " + mysql.escape(serialNumber) + ");"        
            console.log(sql);
            connectionDB.query(sql, function(error, resp) {
                if (error){
                    console.log("Error al actualizar informacion del equipo" + error);
                    return res.status(500).send("Error al actualizar informacion del equipo" + error);
                } 
                res.status(200).json(resp);
            });
        });

        app.get("/api/v1/infoequipo/:serial", cors(corsOptions), function(req, res) {
            var serial = req.params.serial;
            console.log("En infoEquipo buscar datos de= " + serial);
            connectionDB.query("SELECT * FROM infoequipo WHERE serialNumber = ?", [serial], function(error, equipo) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo equipo");
                } 
                if (equipo.length == 0) {
                    console.log("Error. Equipo no encontrado");
                    return res.status(404).send("Error. Equipo no encontrado");
                }
                res.status(200).json(equipo);
            });
        });
        app.delete("/api/v1/infoequipo/:serial", cors(corsOptions), function(req, res) {
            var serial = req.params.serial;
            console.log(" borrar serial= ", serial);
            connectionDB.query("DELETE FROM infoequipo WHERE (serialNumber =" + serial + ");", function(error, equipo) {
                if (error) return res.status(500).send("Error al borrar my device= " +serial + "," + error);
                res.status(200).json(equipo);
            });
        });
        /**********************Busca todos los equipos de un cliente ********************/
        app.get("/api/v1/infoequipo/:emailCliente", cors(corsOptions), function(req, res) {
            var emailCliente = req.params.emailCliente;
            connectionDB.query("SELECT * FROM infoequipo WHERE emailCliente = ?", [emailCliente], function(error, equipos) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo equipos");
                } 
                if (equipo.length == 0) return res.status(404).send("Error. Ningun equipo no encontrado");
                res.status(200).json(equipos);
            });
        });
        /**********************Comando ON / OFF de un equipo********************/
        app.put("/api/v1/onoff", cors(corsOptions), function(req, res,next) {
            console.log(req.body);
            var serial = req.body.serialNumber;
            var onoff = req.body.onoff;

            var sql = "UPDATE equipo SET onoff = " + mysql.escape(onoff) + " WHERE (serialNumber = " + mysql.escape(serial) + ");"
            console.log(sql);
            connectionDB.query(sql, function(error, resp) {
                if (error) return res.status(500).send("Error actualizar equipo");
    //            res.status(200).json(200);
                next();
            });
        });
        /**********************Continuacion de Comando ON / OFF  para actualizar Fecha y Hora********************/
        app.put("/api/v1/onoff", cors(corsOptions), function (req, res) {
            console.log(req.body);
            var serial = req.body.serialNumber;
            var dateTime = getDateTime();

            var sql = "UPDATE infoequipo SET lastConn = " + mysql.escape(dateTime) + " WHERE (serialNumber = " + mysql.escape(serial) + ");"
            console.log(sql);
            connectionDB.query(sql, function (error, resp) {
                if (error) return res.status(500).send("Error=" + error + " actualizar equipo");
                console.log('resposta datetime=' + resp);
                res.status(200).json(resp);
            });
        });
        /********************* VIVIEDAS *********************/
        app.get("/api/v1/vivienda", cors(corsOptions), function(req, res) {
            connectionDB.query("SELECT * FROM vivienda", function(error, viviendas) {
                if (error){
                    console.log(" Error viviendas= ", error)
                    return res.status(500).send("Error obteniendo viviendas");
                } 
                res.status(200).json(viviendas);            
                });           
        });

        app.get("/api/v1/viviendas/:emailCliente", cors(corsOptions), function (req, res) {
            var emailCliente = req.params.emailCliente;
            console.log("GET Viviendas emailCliente=", emailCliente);
            connectionDB.query("SELECT * FROM vivienda WHERE emailCliente = ?", [emailCliente], function (error, viviendas) {
                if (error) {
                    console.log(" Error viviendas= ", error);
                    return res.status(500).send("Error" + error + " obteniendo viviendas");
                }
                res.status(200).json(viviendas);
            });
        });

        /********************* Crea una Nueva vivienda *********************/
        app.post("/api/v1/vivienda", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var nombreVivienda = req.body.nombreVivienda;
            var emailCliente = req.body.emailCliente;
            var pais = req.body.pais;
            var ciudad = req.body.ciudad;
            var ubicacion = req.body.ubicacion;
            var codigoPostal = req.body.codigoPostal;

            var sql = "INSERT INTO vivienda (nombreVivienda, emailCliente, pais, ciudad, ubicacion, codigoPostal) VALUES (" +
             mysql.escape(nombreVivienda) + "," + mysql.escape(emailCliente) + "," + mysql.escape(pais) +
             "," + mysql.escape(ciudad) + "," + mysql.escape(ubicacion) + "," + mysql.escape(codigoPostal) + ");"      
            connectionDB.query(sql, function(error, vivienda) {
                console.log(error);
                if (error) {
                    console.log("Error al crear vivenda" + error)
                    return res.status(500).send("Error al crear vivenda" + error);
                } 
                return res.status(200).json(vivienda);
            });        
        });
        /********************* Actualiza vivienda *********************/
        app.put("/api/v1/vivienda", cors(corsOptions), function(req, res) {
            console.log(req.body);
    //        var id = req.body.id;
            var nombreVivienda = req.body.nombreVivienda;
            var emailCliente = req.body.emailCliente;
            var pais = req.body.pais;
            var ciudad = req.body.ciudad;
            var ubicacion = req.body.ubicacion;
            var codigoPostal = req.body.codigoPostal;

            var sql = "UPDATE vivienda SET emailCliente = " + mysql.escape(emailCliente) + ',' + " pais = " + mysql.escape(pais) +
              ',' + " ciudad = " + mysql.escape(ciudad) + ',' + " ubicacion = " + mysql.escape(ubicacion) +
              ',' +  " codigoPostal = " + mysql.escape(codigoPostal) + " WHERE (nombreVivienda = " + mysql.escape(nombreVivienda) + ");"
            console.log(sql);
            connectionDB.query(sql, function(error, vivienda) {
                if (error) return res.status(500).send("Error actualizar vivienda - " + error);
                res.status(200).json(vivienda);
            });
        });
        app.get("/api/v1/vivienda/:id", cors(corsOptions), function(req, res) {
            var id = req.params.id;
            console.log("GET Vivienda id=", id);
            connectionDB.query("SELECT * FROM vivienda WHERE id = ?", [id], function(error, vivienda) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo vivienda");
                } 
                if (vivienda.length == 0) return res.status(404).send("Error. Vivienda  de " + id + " no encontrada");
                res.status(200).json(vivienda);
            });
        });
            // Get vivienda by name
            app.get("/api/v1/viviendabyname/:nombreVivienda", cors(corsOptions), function (req, res) {
                var nombreVivienda = req.params.nombreVivienda;
                console.log("GET datos Vivienda de = ", nombreVivienda);
                connectionDB.query("SELECT * FROM vivienda WHERE nombreVivienda = ?", [nombreVivienda], function (error, habitacion) {
                    if (error) {
                        console.log(error);
                        return res.status(500).send("Error " + error + " obteniendo vivienda");
                    }
                    if (habitacion.length == 0) return res.status(404).send("Error. Vivienda  de " + nombreVivienda + " no encontrada");
                    res.status(200).json(habitacion);
                });
            });
        // borra primero habitaciones para despues borrar viviendas
        app.delete("/api/v1/vivienda/:nombreVivienda", cors(corsOptions), function(req, res, next) {
            var nombreVivienda = req.params.nombreVivienda;
            console.log(" borrar Habitacion= ", nombreVivienda);
            connectionDB.query("DELETE FROM habitacion WHERE (nombreVivienda ='" + nombreVivienda + "');", function(error, vivienda) {
                if (error){
     //                return res.status(500).send("Error al borrar Habitacion= " + nombreVivienda + "," + error);
                    console.log(" No Hay habitacion cadastrada, ver viviendas");
                }
            });
            next();
        });
        app.delete("/api/v1/vivienda/:nombreVivienda", cors(corsOptions), function(req, res) {
            var nombreVivienda = req.params.nombreVivienda;
            console.log(" borrar Vivienda= ", nombreVivienda);
            connectionDB.query("DELETE FROM vivienda WHERE (nombreVivienda ='" + nombreVivienda + "');", function(error, vivienda) {
                if (error){
                     return res.status(500).send("Error al borrar vivenda= " + nombreVivienda + ", " + error);
                }
                res.status(200).json(vivienda);
            });
        });
    /********************* HABITACIONES *********************/
        app.get("/api/v1/habitacion", cors(corsOptions), function(req, res) {
            connectionDB.query("SELECT * FROM habitacion", function(error, habitacion) {
                if (error) return res.status(500).send("Error obteniendo habitacion");
                res.status(200).json(habitacion);            
                });           
        });
        app.post("/api/v1/habitacion", cors(corsOptions), function(req, res) {
            var id = req.body.id;
            var nombreVivienda = req.body.nombreVivienda;
            var nombreHabitacion = req.body.nombreHabitacion;
            var serialNumber = req.body.serialNumber;
            var sql2 = "INSERT INTO habitacion (serialNumber, nombreVivienda, nombreHabitacion) VALUES (" +
                mysql.escape(serialNumber) + "," + mysql.escape(nombreVivienda) + "," + mysql.escape(nombreHabitacion) + ");"      
            connectionDB.query(sql2, function(error, resp) {
                console.log(error);
                if (error) {
                    return res.status(500).send("Error " + error + " al crear habitacion en la vivienda  " + nombreVivienda );
                }else {
                    return res.status(200).json(resp);
                }
            });
        });
        app.put("/api/v1/habitacion", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var id = req.body.id;
            var nombreVivienda = req.body.nombreVivienda;
            var nombreHabitacion = req.body.nombreHabitacion;
            var serialNumber = req.body.serialNumber;

            var sql = "UPDATE habitacion SET nombreVivienda = " + mysql.escape(nombreVivienda) + ',' +
                " nombreHabitacion = " + mysql.escape(nombreHabitacion) + ',' + " serialNumber = " + mysql.escape(serialNumber) +
                 " WHERE (id = " + mysql.escape(id) + ");"
            console.log(sql);
            connectionDB.query(sql, function(error, habitacion) {
                if (error) return res.status(500).send("Error" + error + " al actualizar habitacion");
                res.status(200).json(habitacion);
            });
        });
    // Busca una unica habitacion
        app.get("/api/v1/habitacion/:nombreHabitacion", cors(corsOptions), function(req, res) {
            var nombreHabitacion = req.params.nombreHabitacion;
            console.log('nombreHabitacion=' + nombreHabitacion);
            connectionDB.query("SELECT * FROM habitacion WHERE nombreHabitacion = ?", [nombreHabitacion], function(error, habitacion) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo habitacion");
                } 
                if (habitacion.length == 0) return res.status(404).send("Error. Habitacion  " + nombreHabitacion + " no encontrada");
                res.status(200).json(habitacion);
            });
        });

        // Busca todas las habitaciones de una vivienda
        app.get("/api/v1/habVivienda/:nombreVivienda", cors(corsOptions), function (req, res) {
            var nombreVivienda = req.params.nombreVivienda;
            console.log("buscar habitaciones de =", nombreVivienda);
            connectionDB.query("SELECT * FROM habitacion WHERE nombreVivienda = ?", [nombreVivienda], function (error, habitaciones) {

                if (error) {
                    console.log(error);
                    return res.status(500).send("Error obteniendo habitaciones de una vivienda");
                }
                if (habitaciones.length == 0) return res.status(404).send("Error. Habitaciones de la vivienda " + nombreVivienda + " no encontrada");
                res.status(200).json(habitaciones);
            });
        });

    // Busca todas las habitaciones de un unico cliente
        app.get("/api/v1/habitaciones/:emailCliente", cors(corsOptions), function(req, res) {
            var emailCliente = req.params.emailCliente;
            console.log("buscar habitaciones de=", emailCliente );
            connectionDB.query("SELECT o.* FROM tfm.vivienda AS uo INNER JOIN tfm.habitacion AS o ON uo.nombreVivienda = o.nombreVivienda WHERE uo.emailCliente = ?", [emailCliente], function(error, habitacion) {

            if (error) {
                    console.log(error);
                    return res.status(500).send("Error obteniendo habitaciones de un cliente");
                } 
                if (habitacion.length == 0) return res.status(404).send("Error. Habitaciones de la vivienda del cliente  " + emailCliente + " no encontrada");
                res.status(200).json(habitacion);
            });
        });
        app.delete("/api/v1/habitacion/:nombreHabitacion", cors(corsOptions), function(req, res, next) {
            var nombreHabitacion = req.params.nombreHabitacion;
            console.log(" borrar Habitacion= ", nombreHabitacion);
            connectionDB.query("DELETE FROM habitacion WHERE (nombreHabitacion ='" + nombreHabitacion + "');", function(error, habitacion) {
                if (error){
                    console.log("Error al borrar Habitacion= " + nombreHabitacion + "," + error);
                    return res.status(500).send("Error al borrar Habitacion= " + nombreHabitacion + "," + error);
                }
                res.status(200).json(habitacion);
            });
        });

    /********************* DATOS *********************/  
        app.get("/api/v1/datos", cors(corsOptions), function(req, res) {
            connectionDB.query("SELECT * FROM datos", function(error, datos) {
                if (error) return res.status(500).send("Error obteniendo los datos");
                res.status(200).json(datos);            
                });           
        });
        app.post("/api/v1/datos", cors(corsOptions), function(req, res) {
            var serialNumber = req.body.serialNumber;
            var dataTime = getDateTime();
            var tension = req.body.tension;
            var corriente = req.body.corriente;
            var on = req.body.on;
            var off = req.body.off;

            var sql2 = "INSERT INTO datos (serialNumber, dataTime, tension, corriente, on, off) VALUES (" +
                mysql.escape(serialNumber) + "," + mysql.escape(dataTime) + "," + mysql.escape(tension) +
                "," + mysql.escape(corriente)+ "," + mysql.escape(on) + "," + mysql.escape(off) + ");"      
            connectionDB.query(sql2, function(error, resp) {
                console.log(error);
                if (error) {
                        return res.status(500).send("Error al crear vivienda y habitacion");
                }else {
                    return res.status(200).json(resp);
                }
            });
        });
        app.put("/api/v1/datos", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var id = req.body.id;
            var serialNumber = req.body.serialNumber;
            var dataTime = getDateTime();
            var tension = req.body.tension;
            var corriente = req.body.corriente;
            var on = req.body.on;
            var off = req.body.off;

            var sql = "UPDATE datos SET dataTime = " + mysql.escape(dataTime) + ',' +
              " tension = " + mysql.escape(tension) +  " serialNumber = " + mysql.escape(serialNumber) +
              ',' + " corriente = " + mysql.escape(corriente) + ',' + " on = " + mysql.escape(on) +
              ',' + " off = " + mysql.escape(off) + " WHERE (id = " + mysql.escape(id) + ");"
            console.log(sql);
            connectionDB.query(sql, function(error, datos) {
                if (error) return res.status(500).send("Error actualizar los datos");
                res.status(200).json(datos);
            });
        });
        app.get("/api/v1/datos/:serialNumber", cors(corsOptions), function(req, res) {
            var serialNumber = req.params.serialNumber;
            connectionDB.query("SELECT * FROM datos WHERE serialNumber = ?", [serialNumber], function(error, datos) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo los datos del equipos" + serialNumber );
                } 
                if (datos.length == 0) return res.status(404).send("Error. datos del equipo  " + serialNumber + " no encontrados");
                res.status(200).json(datos);
            });
        });
        app.delete("/api/v1/datos/:serialNumber", cors(corsOptions), function(req, res) {
            var serialNumber = req.params.serialNumber;
            console.log('Borrar datos de=' + serialNumber);
            connectionDB.query("DELETE FROM datos WHERE (serialNumber =" + serialNumber + ");", function(error, datos) {
                if (error){
                     return res.status(500).send("Error al borrar datos de= " + serialNumber + "," + error);
                }
                res.status(200).json(datos);
            });
        });
        /********************* Busca DATOS de los equipos de un cliente  *********************/
        app.get("/api/v1/informes/:emailCliente", cors(corsOptions), function (req, res) {
            var emailCliente = req.params.emailCliente;
            console.log(" Buscar DATOS de un Equipo de un cliente= ", emailCliente);
            //connectionDB.query("SELECT * FROM datos WHERE serialNumber = ?", [serialNumber], function (error, datos) {
            connectionDB.query("SELECT o.* FROM infoequipo AS uo INNER JOIN datos AS o ON uo.serialNumber = o.serialNumber WHERE uo.emailCliente = ?;", [emailCliente], function (error, datos) {
                if (error) {
                    console.log(error);
                    return res.status(500).send("Error obteniendo los datos del equipos" + emailCliente);
                }
                if (datos.length == 0) return res.status(404).send("Error. datos del equipo  " + emailCliente + " no encontrados");
                res.status(200).json(datos);
            });
        });
        /********************* Busca Valor medio de Tension y corriente de un equipo de un cliente  *********************/
        app.post("/api/v1/math", cors(corsOptions), function (req, res) {
            var serialNumber = req.body.serialNumber;
            var tipo = req.body.tipo;
            var sql = "SELECT AVG("+ tipo +") as valorMedio from datos WHERE (serialNumber=" + mysql.escape(serialNumber) + ");"
            console.log("sql=" + sql);
            connectionDB.query(sql, function (error, datos) {           
                if (error) return res.status(500).send( error +"Al buscar los datos de " + serialNumber);
                res.status(200).json(datos);
            });
        });
        app.get("/api/v1/grafico/:serialNumber", cors(corsOptions), function (req, res) {
            var serialNumber = req.params.serialNumber;
            console.log("En datos para montar grafico de = " + serialNumber);
            connectionDB.query("SELECT `dataTime`,`on` from  datos WHERE serialNumber= ?;", [serialNumber], function (error, equipo) {
                if (error) {
                    console.log(error);
                    return res.status(500).send("Error obteniendo equipo");
                }
                if (equipo.length == 0) {
                    console.log("Error. Equipo no encontrado");
                    return res.status(404).send("Error. Equipo no encontrado");
                }
                res.status(200).json(equipo);
            });
        });
        app.get("/api/v1/onuoff/:serialNumber", cors(corsOptions), function (req, res) {
            var serialNumber = req.params.serialNumber;
            console.log("VER si equipo esta on u off de  = " + serialNumber);
            connectionDB.query("SELECT onoff from equipo WHERE serialNumber= ?;", [serialNumber], function (error, equipo) {
                if (error) {
                    console.log(error);
                    return res.status(500).send("Error obteniendo estado del equipo");
                }
                if (equipo.length == 0) {
                    console.log("Error. Equipo no encontrado");
                    return res.status(404).send("Error. Equipo no encontrado");
                }
                res.status(200).json(equipo);
            });
        });
        app.get("/api/v1/potencia/:serialNumber", cors(corsOptions), function (req, res) {
            var serialNumber = req.params.serialNumber;
            console.log("VER si equipo esta on u off de  = " + serialNumber);
            connectionDB.query("SELECT (AVG(corriente)/1000) * AVG(tension) as potencia from datos WHERE serialNumber= ?", [serialNumber], function (error, equipo) {
                if (error) {
                    console.log(error);
                    return res.status(500).send("Error obteniendo potencia del equipo");
                }
                if (equipo.length == 0) {
                    console.log("Error. Equipo no encontrado");
                    return res.status(404).send("Error. Equipo no encontrado");
                }
                res.status(200).json(equipo);
            });
        });

        app.get("/api/v1/equiposinhab/:emailCliente", cors(corsOptions), function (req, res) {
            var emailCliente = req.params.emailCliente;
            console.log("VER equipos sin habitaciones de = " + emailCliente);
            connectionDB.query("SELECT a.serialNumber FROM tfm.infoequipo a LEFT JOIN tfm.habitacion b ON a.serialNumber = b.serialNumber WHERE b.serialNumber IS NULL AND emailCliente = ?" , [emailCliente], function (error, serial) {
                if (error) {
                    console.log(error);
                    return res.status(500).send("Error obteniendo seriales disponibles");
                }
                if (serial.length == 0) {
                    console.log("Error. Serial no encontrado");
                    return res.status(404).send("Error. Serial no encontrada");
                }
                res.status(200).json(serial);
            });
        });
        /********************* ALARMAS *********************/
        app.get("/api/v1/alarm", cors(corsOptions), function (req, res) {
            connectionDB.query("SELECT * FROM alarm", function (error, datos) {
                if (error) return res.status(500).send("Error obteniendo los datos");
                res.status(200).json(datos);
            });
        });
        app.post("/api/v1/alarm", cors(corsOptions), function (req, res) {
            var serialNumber = req.body.serialNumber;
            var dataTime = getDateTime();
            var emailCliente = req.body.emailCliente;

            var sql = "INSERT INTO alarm (serialNumber, dataTime, emailCliente) VALUES (" +
                mysql.escape(serialNumber) + "," + mysql.escape(dataTime) + "," + mysql.escape(emailCliente) + ");"
            connectionDB.query(sql, function (error, resp) {
                console.log(error);
                if (error) {
                    return res.status(500).send("Error al crear alarma");
                } else {
                    return res.status(200).json(resp);
                }
            });
        });
        app.get("/api/v1/alarm/:serialNumber", cors(corsOptions), function (req, res) {
            var serialNumber = req.params.serialNumber;
            console.log("VER alarmas de = " + serialNumber);
            connectionDB.query("SELECT * FROM tfm.alarm WHERE serialNumber = ?", [serialNumber], function (error, serial) {
                if (error) {
                    console.log(error);
                    return res.status(500).send("Error obteniendo seriales disponibles");
                }
                if (serial.length == 0) {
                    console.log("Error. Serial no encontrado");
                    return res.status(404).send("Error. Serial no encontrada");
                }
                res.status(200).json(serial);
            });
        });
        app.delete("/api/v1/alarm/:serialNumber", cors(corsOptions), function (req, res) {
            var serialNumber = req.params.serialNumber;
            console.log("Borrar alarmas de = " + serialNumber);
            connectionDB.query("DELETE FROM alarm WHERE (serialNumber ='" + serialNumber + "');", function (error, serial) {
                if (error) {
                    console.log(error);
                    return res.status(500).send("Error borrando seriales disponibles");
                }
                if (serial.length == 0) {
                    console.log("Error. Serial no encontrado");
                    return res.status(404).send("Error. Serial no encontrada");
                }
                res.status(200).json(serial);
            });
        });




        
    /********************* Config API *********************/
    app.use(cors())
    app.use("/api/v1/", function(req, res, next) { // dentro del API
        var token = res.headers['authorization'];
        if (!token) {
            res.status(403).json('missing token');
            console.error("No se ha indicado token");
            return
        }
        console.log("Ok");
        res.send("Ok. " + req.method + " " + req.url);

        // Descodificamos el token para que nos devuelva el usuario y la fecha de expiración
        var payload = jwt.decode(token, secretKey, algorithm);
        if (!payload || !payload.iss || !payload.exp) {
            console.error("Token error");
            return res.status(403).json("Token error");
        }

        // Comprobamos la fecha de expiración
        if (Date.now() > payload.exp) {
            console.error("Expired token");
            return res.status(403).json("Expired token");
        }

        // Añadimos el usuario a req para acceder posteriormente.
        req.user = payload.iss;
        next(); // todo ok, continuar
        
    });

    // Iniciar app
    var port = 3000;
    app.listen(port, function() {
        console.log("Servidor escuchando en puerto:", port);
    });

    }, function(err2) { // se ha producido un error cargando el RAML
        console.log("Error cargando RAML: " + JSON.stringify(err2));
    });

    // Metodos generales

    function getDateTime() {
        let date_ob = new Date();
        var myDate = '';

        // current date
        // adjust 0 before single digit date
        let date = ("0" + date_ob.getDate()).slice(-2);

        // current month
        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

        // current year
        let year = date_ob.getFullYear();

        // current hours
        let hours = date_ob.getHours();

        // current minutes
        let minutes = date_ob.getMinutes();

        // current seconds
        let seconds = date_ob.getSeconds();

        // prints date in YYYY-MM-DD format
       // console.log(year + "-" + month + "-" + date);

        // prints date & time in YYYY-MM-DD HH:MM:SS format
        // console.log(year + "/" + month + "/" + date + " " + hours + ":" + minutes + ":" + seconds);
        myDate = date + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds;
        console.log("Buscando Fecha y Hora = "+ myDate);
        // prints time in HH:MM format
       // console.log(hours + ":" + minutes);

        return myDate
    };
    
});
