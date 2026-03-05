const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// --- MODELO 1: CARGAS (Probamos con 'Cargas' en Mayúscula) ---
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  placa: { type: DataTypes.STRING },
  cont: { type: DataTypes.STRING }
}, { 
  tableName: 'Cargas', // <--- Ajustado a 'Cargas'
  timestamps: true 
});

// --- MODELO 2: YEGO FINANZAS ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_saldo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;margin-top:20px;}
  th,td{padding:15px;border-bottom:1px solid #334155; text-align:left;}
  th{background:#334155;color:#94a3b8;font-size:11px;text-transform:uppercase;}
  .btn{background:#2563eb;color:white;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block;}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;margin-bottom:20px;display:inline-block;min-width:200px;text-align:center;}
</style>`;

app.get('/', async (req, res) => {
  try {
    const despachos = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });

    if (!despachos || despachos.length === 0) {
      return res.send(`<html><head>${css}</head><body><h1>YEGO 💰</h1><p>Conectado a la DB, pero la tabla 'Cargas' está vacía o no se llama así.</p><p><a href="/debug" style="color:#3b82f6">Haz clic aquí para ver nombres de tablas</a></p></body></html>`);
    }

    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    let rows = despachos.map(d => `<tr>
        <td>#${d.id}</td>
        <td><b>${d.placa || '---'}</b></td>
        <td>${d.cont || '---'}</td>
        <td style="color:#34d399; font-weight:bold">$ ${parseFloat(d.Finanza?.v_flete || 0).toLocaleString()}</td>
        <td>${d.Finanza?.est_pago || 'PENDIENTE'}</td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`).join('');

    res.send(`<html><head><title>YEGO</title>${css}</head><body><h1>YEGO 💰 Finanzas</h1><table><thead><tr><th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  } catch (err) { 
    res.send(`<h2>Error</h2><p>${err.message}</p><p><a href="/debug">Ver diagnóstico de tablas</a></p>`); 
  }
});

// --- RUTA DE DIAGNÓSTICO (VITAL) ---
app.get('/debug', async (req, res) => {
  try {
    const [tablas] = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const lista = tablas.map(t => t.table_name).join(' | ');
    res.send(`<h1>Tablas encontradas:</h1><p>${lista}</p>`);
  } catch (e) { res.send(e.message); }
});

app.get('/editar/:id', async (req, res) => {
  try {
    const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
    res.send(`<html><head>${css}</head><body><div style="max-width:400px;margin:auto;background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6"><h2>ID: ${f.cargaId}</h2><form action="/guardar/${f.cargaId}" method="POST"><label>FLETE</label><input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155"><button type="submit" class="btn" style="width:100%">GUARDAR</button></form></div></body></html>`);
  } catch (e) { res.send(e.message); }
});

app.post('/guardar/:id', async (req, res) => {
  const { v_flete } = req.body;
  await Finanza.update({ v_flete, v_saldo: v_flete }, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));
