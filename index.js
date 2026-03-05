const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. CONEXIÓN LIMPIA
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// 2. TU TABLA DE PAGOS (LA QUE SÍ CONTROLAMOS)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

// 3. RUTA PRINCIPAL (USANDO LA FUERZA BRUTA DEL SQL)
app.get('/', async (req, res) => {
  try {
    // Aquí el "encerrado" es con comillas dobles literales. 
    // Es la única forma en que Postgres acepta nombres en MAYÚSCULAS.
    const sql = `
      SELECT 
        "ID", 
        "PLACA", 
        "CLIENTE", 
        "FECHA DESPACHO"
      FROM "Cargas" 
      ORDER BY "ID" DESC 
      LIMIT 100`;
    
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      // Importante: Referenciamos como c.ID porque así lo trae el SQL
      const f = finanzas.find(fin => fin.cargaId === c.ID);
      const valor = f ? Number(f.v_flete).toLocaleString() : "0";
      
      return `
        <tr style="border-bottom: 1px solid #334155">
          <td style="padding:12px">#${c.ID}</td>
          <td><b>${c.PLACA || '---'}</b></td>
          <td>${c.CLIENTE || '---'}</td>
          <td>${c["FECHA DESPACHO"] || '---'}</td>
          <td style="color:#10b981; font-weight:bold">$ ${valor}</td>
          <td>
            <span style="background:${f?.est_pago === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding:4px 8px; border-radius:5px">
              ${f ? f.est_pago : 'PENDIENTE'}
            </span>
          </td>
          <td><a href="/editar/${c.ID}" style="color:#3b82f6; text-decoration:none; font-weight:bold">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px">
        <h2>💰 PANEL CONTABLE - YEGO</h2>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden">
          <thead style="background:#1e40af">
            <tr>
              <th style="padding:12px">ID</th><th>PLACA</th><th>CLIENTE</th><th>FECHA DESPACHO</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCION</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("<h3>ERROR DE IDENTIFICADOR</h3><p>" + err.message + "</p>");
  }
});

// 4. RUTA GUARDAR
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:50px">
      <form action="/guardar/${req.params.id}" method="POST" style="background:#1e293b; padding:20px; border-radius:10px; max-width:300px; margin:auto">
        <h3>Liquidar ID #${req.params.id}</h3>
        Flete: <input type="number" name="v_flete" value="${f.v_flete}" style="width:100%; padding:10px; margin:10px 0"><br>
        Estado: <select name="est_pago" style="width:100%; padding:10px; margin:10px 0">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select><br>
        <button type="submit" style="width:100%; padding:10px; background:#2563eb; color:white; border:none; cursor:pointer">GUARDAR</button>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Sistema YEGO conectado')));
