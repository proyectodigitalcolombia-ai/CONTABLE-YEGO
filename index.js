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

// --- RUTA DE DIAGNÓSTICO (Úsala para saber los nombres reales) ---
app.get('/debug', async (req, res) => {
  try {
    const [results] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Cargas'");
    const columnas = results.map(r => r.column_name);
    res.send(`<h1>Columnas encontradas en la tabla Cargas:</h1><p>${columnas.join(' | ')}</p><p>Busca cuál se refiere al Cliente y cámbiala en el código.</p>`);
  } catch (e) { res.send(e.message); }
});

// --- MODELO 1: CARGAS (AJUSTA AQUÍ LOS NOMBRES) ---
const Carga = db.define('Carga', {
  // Si en /debug sale 'cliente' en vez de 'cli', cambia 'cli' por 'cliente' abajo
  cli: { type: DataTypes.STRING, field: 'cli' }, 
  placa: { type: DataTypes.STRING, field: 'placa' },
  cont: { type: DataTypes.STRING, field: 'cont' },
  orig: { type: DataTypes.STRING, field: 'orig' },
  dest: { type: DataTypes.STRING, field: 'dest' },
  est_real: { type: DataTypes.STRING, field: 'est_real' }
}, { tableName: 'Cargas', timestamps: true });

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

// --- ESTILOS ---
const css = `<style>body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;background:#1e293b;} th,td{padding:12px;border:1px solid #334155; text-align:left;} .btn{background:#2563eb;color:white;padding:5px 10px;text-decoration:none;border-radius:4px;font-size:12px;}</style>`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const despachos = await Carga.findAll({
      where: { placa: { [Op.ne]: null } },
      include: [Finanza]
    });

    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    let rows = despachos.map(d => `
      <tr>
        <td>${d.id}</td>
        <td>${d.placa}</td>
        <td>${d.cli}</td>
        <td>$${parseFloat(d.Finanza?.v_flete || 0).toLocaleString()}</td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`).join('');

    res.send(`<html><head>${css}</head><body><h1>YEGO 💰</h1><table><thead><tr><th>ID</th><th>PLACA</th><th>CLIENTE</th><th>FLETE</th><th>ACCION</th></tr></thead><tbody>${rows}</tbody></table><p><a href="/debug" style="color:gray">Ver nombres de columnas (Debug)</a></p></body></html>`);
  } catch (err) { res.send(`<h2>Error de Base de Datos</h2><p>${err.message}</p><p>Entra a <a href="/debug">/debug</a> para ver los nombres reales de tus columnas.</p>`); }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body><form action="/guardar/${f.cargaId}" method="POST" style="max-width:300px;margin:auto;background:#1e293b;padding:20px;border-radius:8px;"><h2>Placa: ${f.Carga.placa}</h2><label>Flete:</label><input type="number" name="v_flete" value="${f.v_flete}" style="width:100%;margin-bottom:10px;"><br><label>Anticipo:</label><input type="number" name="v_anticipo" value="${f.v_anticipo}" style="width:100%;margin-bottom:10px;"><br><button type="submit" class="btn" style="width:100%">GUARDAR</button></form></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  const { v_flete, v_anticipo } = req.body;
  const v_saldo = parseFloat(v_flete) - parseFloat(v_anticipo);
  await Finanza.update({ v_flete, v_anticipo, v_saldo }, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));
