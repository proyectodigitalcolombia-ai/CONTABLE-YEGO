const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// Solo definimos la tabla de Finanzas, la de Cargas la leeremos manualmente
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;margin:0;}
  .container{max-width:1300px;margin:auto;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;font-size:12px;}
  th,td{padding:12px;border-bottom:1px solid #334155; text-align:left;}
  th{background:#334155;color:#94a3b8;text-transform:uppercase;}
  .btn{background:#2563eb;color:white;padding:6px 12px;text-decoration:none;border-radius:6px;font-size:11px;font-weight:bold;}
  .card{background:#1e293b;padding:15px;border-radius:12px;border-top:4px solid #3b82f6;display:inline-block;margin-bottom:20px;}
</style>`;

app.get('/', async (req, res) => {
  try {
    // 1. Traemos los datos de Cargas usando SQL PURO (Sin modelos que fallen)
    // Usamos comillas dobles por si los nombres tienen espacios
    const [cargas] = await db.query('SELECT * FROM "Cargas" ORDER BY id DESC LIMIT 50');
    
    // 2. Traemos nuestras finanzas
    const finanzas = await Finanza.findAll();

    let total = 0;
    let rows = cargas.map(c => {
        // Buscamos si ya tiene un registro de plata guardado
        const f = finanzas.find(f => f.cargaId == c.id);
        const v = parseFloat(f?.v_flete || 0);
        total += v;

        // Mapeo dinámico: Intentamos leer la empresa de varias formas posibles
        const nombreEmpresa = c.EMPRESA || c.empresa || c["EMPRESA"] || "N/A";
        const placa = c.placa || c.PLACA || "--";

        return `<tr>
          <td>#${c.id}</td>
          <td><b>${placa}</b></td>
          <td>${c.cont || c.CONTENEDOR || '--'}</td>
          <td><span style="color:#94a3b8">${nombreEmpresa}</span></td>
          <td>${c.COMERCIAL || '--'}</td>
          <td>${c.PUERTO || '--'}</td>
          <td style="color:#34d399; font-weight:bold">$ ${v.toLocaleString()}</td>
          <td><span style="color:${f?.est_pago === 'PAGADO' ? '#34d399' : '#f87171'}">${f?.est_pago || 'PENDIENTE'}</span></td>
          <td><a href="/editar/${c.id}?p=${placa}&e=${encodeURIComponent(nombreEmpresa)}" class="btn">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO MASTER</title>${css}</head><body><div class="container">
      <h1>YEGO 💰 Finanzas</h1>
      <div class="card"><h3>Total Cartera</h3><p style="font-size:24px; color:#34d399; margin:0;">$ ${total.toLocaleString()}</p></div>
      <table>
        <thead><tr><th>ID</th><th>PLACA</th><th>CONT</th><th>EMPRESA</th><th>COMERCIAL</th><th>PUERTO</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></body></html>`);
  } catch (err) { 
    res.send(`<h2>Error de Acceso</h2><p>SQL dice: ${err.message}</p>`); 
  }
});

app.get('/editar/:id', async (req, res) => {
    let f = await Finanza.findOne({ where: { cargaId: req.params.id } });
    if (!f) f = { v_flete: 0, est_pago: 'PENDIENTE' };

    res.send(`<html><head>${css}</head><body><div class="container" style="max-width:400px; margin-top:50px;">
      <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
        <h2>Liquidar #${req.params.id}</h2>
        <p style="color:#94a3b8">Placa: ${req.query.p} | Cliente: ${req.query.e}</p>
        <form action="/guardar/${req.params.id}" method="POST">
          <label>VALOR FLETE</label><br>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#34d399;border:1px solid #334155;border-radius:6px;">
          <select name="est_pago" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:6px;">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" class="btn" style="width:100%;padding:15px;">GUARDAR</button>
        </form>
      </div></div></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  const { v_flete, est_pago } = req.body;
  const [finanza, created] = await Finanza.findOrCreate({
    where: { cargaId: req.params.id },
    defaults: { v_flete, est_pago }
  });
  if (!created) {
    await Finanza.update({ v_flete, est_pago }, { where: { cargaId: req.params.id } });
  }
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));
