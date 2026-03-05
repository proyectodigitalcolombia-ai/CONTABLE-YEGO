const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// Forzamos la creación de una tabla nueva para ver si tenemos permisos
const CargaLocal = db.define('CargaLocal', {
  placa: DataTypes.STRING,
  flete: DataTypes.INTEGER
}, { tableName: 'yego_test_table' });

app.get('/', async (req, res) => {
  try {
    await db.authenticate();
    // Creamos la tabla y un viaje de prueba
    await db.sync({ force: false }); 
    const existe = await CargaLocal.findOne();
    if (!existe) {
        await CargaLocal.create({ placa: 'TEST-123', flete: 500000 });
    }

    const viajes = await CargaLocal.findAll();
    let rows = viajes.map(v => `<li>ID: ${v.id} - Placa: ${v.placa} - Flete: $${v.flete}</li>`).join('');

    res.send(`
      <body style="background:#0f172a; color:white; font-family:sans-serif; padding:40px;">
        <h1 style="color:#34d399;">✅ Conexión Exitosa</h1>
        <p>Si ves el viaje de prueba abajo, significa que YEGO está funcionando, pero tu otra plataforma NO está guardando los datos en este mismo enlace (DATABASE_URL).</p>
        <ul style="font-size:20px;">${rows}</ul>
        <hr>
        <p style="color:#94a3b8;">DATABASE_URL actual: <br> <small>${process.env.DATABASE_URL.substring(0, 30)}...</small></p>
      </body>
    `);
  } catch (err) {
    res.send(`<h1 style="color:red;">❌ Error de Conexión</h1><p>${err.message}</p>`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Prueba de fuego online"));
