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
    host: "localhost",
    user: "admin",
    password: "Felipe123",
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

/********************* WEB SOCKET *********************/

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3300 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    console.log(`Received message => ${data}`)
    ws.send('Server ON');
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
    if (err5) console.log("Error al buscar ip" + err5);

    var serverName = 'Prueba';
    var sql = "UPDATE servers SET ip = " + mysql.escape(ip) + " WHERE (serverName = " + mysql.escape(serverName) + ");"
        console.log(sql);
        connectionDB.query(sql, function(error, server) {
            if (error) console.log("Error al grabar IP en la base de datos" + error);
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
        app.use(cors())
        app.use("/api/v1/", middleware); // Analiza el api

        app.use(function(err1, req, res, next) { // Verificar si hay error en el API
            console.log("Error en el API:", err1);
            res.status(err1.status).send("Error API. " + req.method + " " + req.url + ": " + JSON.stringify(err));
        });
        
        /********************* LOGIN *********************/
        // /api/v1/login/:email
        app.get("/api/v1/login/:email", cors(corsOptions), function(req, res) {
            var email = req.params.email;
            console.log("email= ", email);
            connectionDB.query("SELECT * FROM usuario as usu WHERE usu.email = ?", [email], function(error, usuario) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo usuario");
                }                 
                if (usuario.length == 0) return res.status(404).send("Error. usuario no encontrado");
                res.status(200).json(usuario);
            });
        });

     /********************* Verificacion de usuario *********************/
        app.post("/api/v1/login", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var email = req.body.email;
            var contrasena = req.body.contrasena;
            var sql = "SELECT usu.id FROM usuario as usu Where usu.email = " + mysql.escape(email) +  " and usu.contrasena = " +  mysql.escape(contrasena)+""
            console.log(sql);
         /********************* Login area *********************/
            connectionDB.query(sql, function(error, usuario) {
                if (error) return res.status(500).send("Error obteniendo usuarios");
                var userId = usuario;
               
                if (usuario.length == 0 ){
                    return res.status(401).send("Error usuarios o contraseña");
                }
                var payload = {
                    iss: userId,
                    exp: Date.now() + expire
                };
                var token = jwt.encode(payload, secretKey, algorithm);
                console.log('Token ' + token);
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

            var sql = "INSERT INTO usuario (id , email, contrasena, tipo, nombre, apellido) VALUES (" + mysql.escape(id) + "," + mysql.escape(email) + "," + mysql.escape(contrasena) + "," + mysql.escape(tipo) + "," + mysql.escape(nombre) + "," + mysql.escape(apellido) + ");"
            
            connectionDB.query(sql, function(error, pedidos) {
                console.log(error);
                if (error) return res.status(500).send("Error crear usuario");
                res.status(200).json(pedidos);
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
        app.delete("/api/v1/usuario/:email", cors(corsOptions), function(req, res) {
            var email = req.params.email;
            console.log("email= ", email);
            connectionDB.query("DELETE FROM usuario WHERE (email =" + email + ");", function(error, usuario) {
                if (error) return res.status(500).send("Error al borrar usuario= " + email + "," + error);
                res.status(200).json(usuario);
            });
        });
        app.get("/api/v1/usuario/:email", cors(corsOptions), function(req, res) {
            var email = req.params.email;
            console.log("GET Usuario con email= ", email);
            connectionDB.query("SELECT * FROM usuario WHERE (email =" + email + ");", function(error, usuario) {
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
          " accion = " + mysql.escape(accion) +  " horaInicio = " + mysql.escape(horaInicio) +
            " horaFinal = " + mysql.escape(horaFinal) + " WHERE (serialNumber = " + mysql.escape(serial) + ");"
        console.log(sql);
        connectionDB.query(sql, function(error, equipo) {
            if (error) return res.status(500).send("Error actualizar equipo");
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
        connectionDB.query("DELETE FROM equipo WHERE (serial =" + serial + ");", function(error, usuario) {
            if (error) return res.status(500).send("Error al borrar usuario= " + serial + "," + error);
            res.status(200).json(usuario);
        });
    });

/*>>>******************** INFORMACION de EQUIPOS PARA FRONT END *******************<<<*/
    app.get("/api/v1/infoequipo", cors(corsOptions), function(req, res) {
        connectionDB.query("SELECT * FROM infoequipo", function(error, equipo) {
            if (error) return res.status(500).send("Error obteniendo devices");
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
        var sitio = req.body.sitio;
        var descripcion = req.body.descripcion;
        var emailCliente = req.body.emailCliente;
        var lastConn = req.body.lastConn;
        var sql ="UPDATE infoequipo SET nombreEquipo = " + mysql.escape(nombreEquipo) + ',' +
         " sitio = " + mysql.escape(sitio) + ',' + " descripcion = " +  mysql.escape(descripcion) + ',' +
          " emailCliente = " +  mysql.escape(emailCliente) +  ',' + " lastConn = " +  mysql.escape(lastConn) +
           " WHERE (serialNumber = " + mysql.escape(serialNumber) + ");"        
        console.log(sql);
        connectionDB.query(sql, function(error, resp) {
            if (error) return res.status(500).send(error);
            res.status(200).json(resp);
        });
    });

    app.get("/api/v1/infoequipo/:serial", cors(corsOptions), function(req, res) {
        var serial = req.params.serial;
        connectionDB.query("SELECT * FROM infoequipo WHERE serialNumber = ?", [serial], function(error, equipo) {
            if (error){
                console.log(error);
                return res.status(500).send("Error obteniendo equipo");
            } 
            if (equipo.length == 0) return res.status(404).send("Error. Equipo no encontrado");
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
    app.put("/api/v1/onoff", cors(corsOptions), function(req, res) {
        console.log(req.body);
        var serial = req.body.serialNumber;
        var onoff = req.body.onoff;

        var sql = "UPDATE equipo SET onoff = " + mysql.escape(onoff) + " WHERE (serialNumber = " + mysql.escape(serial) + ");"
        console.log(sql);
        connectionDB.query(sql, function(error, resp) {
            if (error) return res.status(500).send("Error actualizar equipo");
            res.status(200).json(200);
        });
    });
    /********************* VIVIEDAS *********************/
    app.get("/api/v1/vivienda", cors(corsOptions), function(req, res) {
        connectionDB.query("SELECT * FROM viviendas", function(error, viviendas) {
            if (error) return res.status(500).send("Error obteniendo viviendas");
            res.status(200).json(viviendas);            
            });           
    });

    /********************* Crea una Nueva vivienda *********************/
    app.post("/api/v1/vivienda", cors(corsOptions), function(req, res, next) {
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
                return res.status(500).send("Error al crear vivenda" + error);
            } 
 //           return res.status(200).json(equipo);
            next();
        });        
    });
    app.post("/api/v1/vivienda", cors(corsOptions), function(req, res) {
        var nombreVivienda = req.body.nombreVivienda;
        var nombreHabitacion = req.body.nombreHabitacion;
        var serialNumber = req.body.serialNumber;
        var sql2 = "INSERT INTO habitacion (serialNumber, nombreVivienda, nombreHabitacion) VALUES (" +
         mysql.escape(serialNumber) + "," + mysql.escape(nombreVivienda) + "," + mysql.escape(nombreHabitacion) + ");"      
        connectionDB.query(sql2, function(error, resp) {
            console.log(error);
            if (error) {
                 return res.status(500).send("Error al crear vivienda y Habitacion");
            }else {
                return res.status(200).json(resp);
 //               return res.redirect('/');
            }
        });
    });
       /********************* Actualiza vivienda *********************/
       app.put("/api/v1/vivienda", cors(corsOptions), function(req, res) {
        console.log(req.body);
        var id = req.body.id;
        var nombreVivienda = req.body.nombreVivienda;
        var emailCliente = req.body.emailCliente;
        var pais = req.body.pais;
        var ciudad = req.body.ciudad;
        var ubicacion = req.body.ubicacion;
        var codigoPostal = req.body.codigoPostal;

        var sql = "UPDATE vivienda SET nombreVivienda = " + mysql.escape(nombreVivienda) + ',' +
          " emailCliente = " + mysql.escape(emailCliente) +  " pais = " + mysql.escape(pais) +
            " ciudad = " + mysql.escape(ciudad) + " ubicacion = " + mysql.escape(ubicacion) +
            " codigoPostal = " + mysql.escape(codigoPostal) + " WHERE (id = " + mysql.escape(id) + ");"
        console.log(sql);
        connectionDB.query(sql, function(error, equipo) {
            if (error) return res.status(500).send("Error actualizar vivienda");
            res.status(200).json(equipo);
        });
    });
    app.get("/api/v1/vivienda/:nombreVivienda", cors(corsOptions), function(req, res) {
        var nombreVivienda = req.params.nombreVivienda;
        connectionDB.query("SELECT * FROM vivienda WHERE nombreVivienda = ?", [nombreVivienda], function(error, vivienda) {
            if (error){
                console.log(error);
                return res.status(500).send("Error obteniendo vivienda");
            } 
            if (vivienda.length == 0) return res.status(404).send("Error. Vivienda  " + nombreVivienda + " no encontrada");
            res.status(200).json(vivienda);
        });
    });
    // borra primero habitaciones para despues borrar viviendas
    app.delete("/api/v1/vivienda/:nombreVivienda", cors(corsOptions), function(req, res, next) {
        var nombreVivienda = req.params.nombreVivienda;
        console.log(" borrar Habitacion= ", nombreVivienda);
        connectionDB.query("DELETE FROM habitacion WHERE (nombreVivienda =" + nombreVivienda + ");", function(error, vivienda) {
            if (error){
 //                return res.status(500).send("Error al borrar Habitacion= " + nombreVivienda + "," + error);
                console.log(" No Hay habitacion cadastrada, ver viviendas");
            }
            next();
        });
    });
    app.delete("/api/v1/vivienda/:nombreVivienda", cors(corsOptions), function(req, res) {
        var nombreVivienda = req.params.nombreVivienda;
        console.log(" borrar Vivienda= ", nombreVivienda);
        connectionDB.query("DELETE FROM vivienda WHERE (nombreVivienda =" + nombreVivienda + ");", function(error, vivienda) {
            if (error){
                 return res.status(500).send("Error al borrar vivenda= " + nombreVivienda + "," + error);
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
        var nombreVivienda = req.body.nombreVivienda;
        var nombreHabitacion = req.body.nombreHabitacion;
        var serialNumber = req.body.serialNumber;
        var sql2 = "INSERT INTO habitacion (serialNumber, nombreVivienda, nombreHabitacion) VALUES (" +
            mysql.escape(serialNumber) + "," + mysql.escape(nombreVivienda) + "," + mysql.escape(nombreHabitacion) + ");"      
        connectionDB.query(sql2, function(error, resp) {
            console.log(error);
            if (error) {
                    return res.status(500).send("Error al crear vivienda y habitacion");
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

        var sql = "UPDATE vivienda SET nombreVivienda = " + mysql.escape(nombreVivienda) + ',' +
          " nombreHabitacion = " + mysql.escape(nombreHabitacion) +  " serialNumber = " + mysql.escape(serialNumber) +
             " WHERE (id = " + mysql.escape(id) + ");"
        console.log(sql);
        connectionDB.query(sql, function(error, habitacion) {
            if (error) return res.status(500).send("Error actualizar habitacion");
            res.status(200).json(habitacion);
        });
    });

    app.get("/api/v1/habitacion/:nombreHabitacion", cors(corsOptions), function(req, res) {
        var nombreHabitacion = req.body.nombreHabitacion;
        connectionDB.query("SELECT * FROM habtitacion WHERE nombreHabitacion = ?", [nombreHabitacion], function(error, habitacion) {
            if (error){
                console.log(error);
                return res.status(500).send("Error obteniendo habitacion");
            } 
            if (habitacion.length == 0) return res.status(404).send("Error. Habitacion  " + nombreHabitacion + " no encontrada");
            res.status(200).json(habitacion);
        });
    });
    app.delete("/api/v1/vivienda/:nombreHabitacion", cors(corsOptions), function(req, res, next) {
        var nombreHabitacion = req.body.nombreHabitacion;
        console.log(" borrar Habitacion= ", nombreHabitacion);
        connectionDB.query("DELETE FROM habitacion WHERE (nombreHabitacion =" + nombreHabitacion + ");", function(error, habitacion) {
            if (error){
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
        var dataTime = req.body.dataTime;
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
        var dataTime = req.body.dataTime;
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
        var serialNumber = req.body.serialNumber;
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
        var serialNumber = req.body.serialNumber;
        console.log(" borrar datos= ", serialNumber);
        connectionDB.query("DELETE FROM datos WHERE (serialNumber =" + serialNumber + ");", function(error, datos) {
            if (error){
                 return res.status(500).send("Error al borrar datos de= " + serialNumber + "," + error);
            }
            res.status(200).json(datos);
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

    // Configuracion WEB Socket
    
});
