const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// Tu tabla de Finanzas para guardar los pagos
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    // Traemos todo para asegurar que nada se quede por fuera
    const sql = 'SELECT * FROM "Cargas" ORDER BY "ID" DESC LIMIT 50';
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      // Usamos los nombres exactos que vimos en el código de la plataforma
      const id = c.ID;
      const placa = c.PLACA || '---';
      const cliente = c.CLIENTE || '---';
      const despacho = c["FECHA DESPACHO"] || '---';
      
      const f = finanzas.find(fin => fin.cargaId === id);
      const valor = f ? Number(f.v_flete).toLocaleString() : "0";
      const estado = f ? f.est_pago : "PENDIENTE";

      return `
        <tr style="border-bottom:1px solid #334155; height:50px">
          <td style="padding:10px">#${id}</td>
          <td><b>${placa}</b></td>
          <td>${cliente}</td>
          <td>${despacho}</td>
          <td style="color:#10b981; font-weight:bold">$ ${valor}</td>
          <td>
            <span style="background:${estado === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding:5px 10px; border-radius:5px; font-size:10px">
              ${estado}
            </span>
          </td>
          <td><a href="/editar/${id}" style="color:#3b82f6; text-decoration:none; font-weight:bold">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px">
        <h2 style="color:#3b82f6">🚛 Control de Cargas YEGO</h2>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden">
          <thead style="background:#1e40af; color:white">
            <tr>
              <th style="padding:15px; text-align:left">ID</th>
              <th style="text-align:left">PLACA</th>
              <th style="text-align:left">CLIENTE</th>
              <th style="text-align:left">F. DESPACHO</th>
              <th style="text-align:left">VALOR FLETE</th>
              <th style="text-align:left">ESTADO</th>
              <th style="text-align:left">ACCIÓN</th>
            </tr>
          </thead>
          <tbody>\${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("Error de carga: " + err.message);
  }
});

// Rutas para editar (No cambian, ya están funcionando)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; padding:50px; font-family:sans-serif">
      <div style="max-width:300px; margin:auto; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6">
        <h3>Liquidación #\${req.params.id}</h3>
        <form action="/guardar/\${req.params.id}" method="POST">
          <label>Valor Flete:</label><br>
          <input type="number" name="v_flete" value="\${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0"><br>
          <label>Estado de Pago:</label><br>
          <select name="est_pago" style="width:100%; padding:10px; margin:10px 0">
            <option \${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option \${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select><br><br>
          <button type="submit" style="width:100%; padding:10px; background:#2563eb; color:white; border:none; border-radius:5px; cursor:pointer">GUARDAR CAMBIOS</button>
        </form>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 YEGO Online')));
