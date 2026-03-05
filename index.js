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

// Modelo de Finanzas (Tu tabla local)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

// RUTA PRINCIPAL
app.get('/', async (req, res) => {
  try {
    // REVISIÓN DE ENCERRADO:
    // Usamos comillas dobles "" para cada nombre que me pasaste.
    // Esto es lo que evita el error "Column does not exist".
    const sql = `
      SELECT 
        "ID", 
        "FECHA REGISTRO", 
        "PLACA", 
        "CLIENTE", 
        "SUBCLIENTE", 
        "DO / BL", 
        "FECHA DESPACHO", 
        "DESPACHADOR",
        "ESTADO OPERATIVO"
      FROM "Cargas" 
      ORDER BY "ID" DESC 
      LIMIT 100`;
    
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.ID);
      return `
        <tr style="border-bottom: 1px solid #334155">
          <td>#${c.ID}</td>
          <td>${c["FECHA REGISTRO"] || '---'}</td>
          <td><b>${c.PLACA || '---'}</b></td>
          <td>${c.CLIENTE || '---'}</td>
          <td>${c["DO / BL"] || '---'}</td>
          <td>${c["FECHA DESPACHO"] || '---'}</td>
          <td style="color:#10b981; font-weight:bold">$ ${f ? Number(f.v_flete).toLocaleString() : "0"}</td>
          <td><span style="padding:4px 8px; border-radius:5px; background:${f?.est_pago === 'PAGADO' ? '#065f46' : '#7f1d1d'}">
            ${f ? f.est_pago : "PENDIENTE"}
          </span></td>
          <td><a href="/editar/${c.ID}" style="color:#3b82f6; text-decoration:none; font-weight:bold">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px">
        <h2>💰 PANEL CONTABLE YEGO</h2>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden">
          <thead style="background:#1e40af">
            <tr>
              <th style="padding:12px">ID</th>
              <th>REGISTRO</th>
              <th>PLACA</th>
              <th>CLIENTE</th>
              <th>DO / BL</th>
              <th>DESPACHO</th>
              <th>VALOR FLETE</th>
              <th>ESTADO</th>
              <th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>\${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("Error técnico de nombres: " + err.message);
  }
});

// RUTA EDITAR (Sincronizada con NODE_VERSION 20)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:50px">
      <form action="/guardar/\${req.params.id}" method="POST" style="background:#1e293b; padding:25px; border-radius:15px; max-width:350px; margin:auto; border:1px solid #3b82f6">
        <h3 style="margin-top:0">Servicio #\${req.params.id}</h3>
        <label>Valor del Flete:</label>
        <input type="number" name="v_flete" value="\${f.v_flete}" step="0.01" style="width:100%; margin:10px 0; padding:10px; background:#0f172a; color:#10b981; border:1px solid #334155; font-size:18px">
        <label>Estado:</label>
        <select name="est_pago" style="width:100%; margin:10px 0; padding:10px; background:#0f172a; color:white; border:1px solid #334155">
          <option \${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option \${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold">GUARDAR</button>
        <a href="/" style="display:block; text-align:center; margin-top:15px; color:#94a3b8; text-decoration:none; font-size:12px">VOLVER</a>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Conectado con nombres exactos')));
