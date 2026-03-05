const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- CONEXIÓN ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  define: { 
    freezeTableName: true, // No pluralizar tablas
    quoteIdentifiers: true // Mantener mayúsculas/minúsculas tal cual
  }
});

// --- MODELO CARGA (ID ESCRITO EXACTAMENTE ASÍ) ---
const Carga = db.define('Carga', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    field: '"ID"' // <--- FORZADO CON COMILLAS DOBLES PARA POSTGRES
  },
  placa: { type: DataTypes.STRING, field: '"PLACA"' },
  cliente: { type: DataTypes.STRING, field: '"CLI"' },
  fecha: { type: DataTypes.STRING, field: '"F_D"' }
}, { 
  tableName: 'Cargas', 
  timestamps: false 
});

// --- MODELO FINANZAS ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const datos = await Carga.findAll({ include: [Finanza], order: [[{model: Carga}, 'id', 'DESC']] });
    
    let filas = datos.map(c => `
      <tr style="border-bottom:1px solid #334155">
        <td style="padding:10px">#${c.id}</td>
        <td><b>${c.placa || '---'}</b></td>
        <td>${c.cliente || '---'}</td>
        <td style="color:#10b981;font-weight:bold">$ ${Number(c.Finanza?.v_flete || 0).toLocaleString()}</td>
        <td>${c.Finanza?.est_pago || 'PENDIENTE'}</td>
        <td><a href="/editar/${c.id}" style="color:#3b82f6;text-decoration:none;font-weight:bold">EDITAR</a></td>
      </tr>`).join('');

    res.send(`
      <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px">
        <h2 style="color:#3b82f6">💰 Panel Contable YEGO</h2>
        <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden">
          <thead style="background:#1e40af">
            <tr><th style="padding:12px">ID</th><th>PLACA</th><th>CLIENTE</th><th>FLETE</th><th>ESTADO</th><th>ACCION</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>
    `);
  } catch (err) {
    res.status(500).send("<h3>Error de Base de Datos</h3><p>SQL falló al buscar la columna: " + err.message + "</p>");
  }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  try {
    const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
    res.send(`
      <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:40px">
        <div style="background:#1e293b;padding:25px;border-radius:15px;max-width:400px;margin:auto;border:1px solid #3b82f6">
          <h3>Servicio #${req.params.id}</h3>
          <form action="/guardar/${req.params.id}" method="POST">
            <label>Valor Flete:</label>
            <input type="number" name="v_flete" value="${f.v_flete}" style="display:block;width:100%;margin:10px 0;padding:10px;background:#0f172a;color:white;border:1px solid #334155;border-radius:5px">
            <label>Estado:</label>
            <select name="est_pago" style="display:block;width:100%;margin:10px 0;padding:10px;background:#0f172a;color:white;border:1px solid #334155;border-radius:5px">
              <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
              <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
            </select>
            <button type="submit" style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold">GUARDAR</button>
            <a href="/" style="display:block;text-align:center;margin-top:15px;color:#94a3b8;text-decoration:none">Cancelar</a>
          </form>
        </div>
      </body>
    `);
  } catch (e) { res.redirect('/'); }
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Listo')));
