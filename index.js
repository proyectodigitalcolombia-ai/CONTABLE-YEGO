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

// --- MODELO UNIVERSAL ---
// Definimos el modelo sin especificar tabla fija aquí, lo haremos en la ruta
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  placa: { type: DataTypes.STRING },
  cont: { type: DataTypes.STRING }
}, { timestamps: false });

const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_saldo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'yego_finanzas' });

const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;}
  .container{max-width:1100px;margin:auto;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;margin-top:20px;}
  th,td{padding:15px;border-bottom:1px solid #334155; text-align:left;}
  th{background:#334155;color:#94a3b8;font-size:11px;text-transform:uppercase;}
  .btn{background:#2563eb;color:white;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;margin-bottom:20px;display:inline-block;min-width:200px;text-align:center;}
</style>`;

app.get('/', async (req, res) => {
  try {
    // Intentamos detectar la tabla correcta consultando la base de datos
    const [tablas] = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const nombreReal = tablas.find(t => t.table_name.toLowerCase() === 'cargas')?.table_name || 'cargas';
    
    // Forzamos el nombre encontrado
    Carga.tableName = nombreReal;

    const despachos = await Carga.findAll({ order: [['id', 'DESC']] });

    if (!despachos || despachos.length === 0) {
      return res.send(`<html><head>${css}</head><body><div class="container"><h1>YEGO 💰</h1>
      <p>⚠️ No se encuentran datos en la tabla <b>'${nombreReal}'</b>.</p>
      <p>Tablas detectadas en tu DB: ${tablas.map(t => t.table_name).join(', ')}</p>
      </div></body></html>`);
    }

    // Sincronizar con finanzas
    for (let d of despachos) {
      await Finanza.findOrCreate({ where: { cargaId: d.id } });
    }

    const finanzasActualizadas = await Finanza.findAll();
    
    let rows = despachos.map(d => {
      const f = finanzasActualizadas.find(fin => fin.cargaId === d.id);
      return `<tr>
        <td>#${d.id}</td>
        <td><b style="color:#fff">${d.placa || '---'}</b></td>
        <td>${d.cont || '---'}</td>
        <td style="color:#34d399; font-weight:bold">$ ${parseFloat(f?.v_flete || 0).toLocaleString()}</td>
        <td>${f?.est_pago || 'PENDIENTE'}</td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO</title>${css}</head><body>
      <div class="container">
        <h1 style="color:#3b82f6">YEGO 💰 Finanzas</h1>
        <div class="card"><h3>Viajes Detectados</h3><p style="font-size:24px; color:#3b82f6">${despachos.length}</p></div>
        <table>
          <thead><tr><th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </body></html>`);
  } catch (err) { res.send(`<h2>Error Crítico</h2><p>${err.message}</p>`); }
});

// Ruta para editar y guardar se mantienen igual...
app.get('/editar/:id', async (req, res) => {
    try {
        const f = await Finanza.findOne({ where: { cargaId: req.params.id } });
        const [tablas] = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const nombreReal = tablas.find(t => t.table_name.toLowerCase() === 'cargas')?.table_name || 'cargas';
        const [c] = await db.query(`SELECT * FROM "${nombreReal}" WHERE id = ${req.params.id}`);
        
        res.send(`<html><head>${css}</head><body>
          <div style="max-width:400px;margin:40px auto;background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
            <h2>Liquidar ID: ${req.params.id}</h2>
            <p>Placa: ${c[0]?.placa || 'N/A'}</p>
            <form action="/guardar/${req.params.id}" method="POST">
              <label>VALOR FLETE</label><input type="number" name="v_flete" value="${f?.v_flete || 0}" step="0.01" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155">
              <label>ANTICIPO</label><input type="number" name="v_anticipo" value="${f?.v_anticipo || 0}" step="0.01" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155">
              <button type="submit" class="btn" style="width:100%;padding:15px;cursor:pointer">GUARDAR</button>
            </form>
          </div></body></html>`);
    } catch (e) { res.send(e.message); }
});

app.post('/guardar/:id', async (req, res) => {
  const { v_flete, v_anticipo } = req.body;
  const v_saldo = parseFloat(v_flete) - parseFloat(v_anticipo);
  await Finanza.upsert({ cargaId: req.params.id, v_flete, v_anticipo, v_saldo });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));
