const express = require('express');
const { Sequelize } = require('sequelize');
const app = express();

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

app.get('/', async (req, res) => {
  try {
    // Esta consulta nos dirá los nombres reales de todas tus tablas
    const [results] = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const nombres = results.map(t => t.table_name).join(' | ');
    
    res.send(`
      <body style="background:#0f172a; color:white; font-family:sans-serif; padding:40px;">
        <h1>Escáner de Base de Datos YEGO</h1>
        <p>Tablas encontradas en tu base de datos:</p>
        <div style="background:#1e293b; padding:20px; border-radius:10px; font-size:20px; color:#34d399; border:1px solid #3b82f6;">
          ${nombres || "No se encontraron tablas públicas"}
        </div>
        <p style="margin-top:20px; color:#94a3b8;">Dime qué nombres aparecen arriba para configurar el sistema correctamente.</p>
      </body>
    `);
  } catch (err) {
    res.send("Error al conectar: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Escáner Online"));
