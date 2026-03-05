const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* =============================
   CONEXION BASE DE DATOS
============================= */

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

/* =============================
   MODELO FINANZAS
============================= */

const Finanza = db.define('Finanza', {

  cargaId: { type: DataTypes.INTEGER, unique: true },

  v_flete: { type: DataTypes.DECIMAL(15,2), defaultValue:0 },

  v_facturar: { type: DataTypes.DECIMAL(15,2), defaultValue:0 },

  est_pago: { type: DataTypes.STRING, defaultValue:'PENDIENTE' },

  tipo_anticipo: { type: DataTypes.STRING },

  valor_anticipo: { type: DataTypes.DECIMAL(15,2), defaultValue:0 },

  sobre_anticipo: { type: DataTypes.DECIMAL(15,2), defaultValue:0 },

  estado_ant: { type: DataTypes.STRING },

  fecha_pago_ant: { type: DataTypes.DATEONLY },

  saldo_a_pagar: { type: DataTypes.DECIMAL(15,2), defaultValue:0 },

  retefuente: { type: DataTypes.DECIMAL(15,2), defaultValue:0 },

  reteica: { type: DataTypes.DECIMAL(15,2), defaultValue:0 },

  valor_descuento: { type: DataTypes.DECIMAL(15,2), defaultValue:0 },

  dias_sin_pagar: { type: DataTypes.INTEGER, defaultValue:0 }

},{
  tableName:'Yego_Finanzas'
});

/* =============================
   FUNCION STATUS SI / NO
============================= */

function statusCheck(v){

 if(v==="SI") return '<span style="color:#10b981;">✅ SI</span>'

 if(v==="NO") return '<span style="color:#ef4444;">❌ NO</span>'

 return v || "---"
}

/* =============================
   LISTADO PRINCIPAL
============================= */

app.get('/', async (req,res)=>{

try{

const sql = `

SELECT

c.*,

f."v_flete",
f."v_facturar",
f."est_pago",
f."tipo_anticipo",
f."valor_anticipo",
f."sobre_anticipo",
f."estado_ant",
f."fecha_pago_ant",
f."saldo_a_pagar",
f."retefuente",
f."reteica",
f."valor_descuento",
f."dias_sin_pagar"

FROM "Cargas" c

LEFT JOIN "Yego_Finanzas" f
ON f."cargaId" = c.id

WHERE c.placa IS NOT NULL
AND c.placa != ''

ORDER BY c.id DESC
LIMIT 150

`;

const cargas = await db.query(sql,{ type: QueryTypes.SELECT })

let totalPendiente = 0

let filas = cargas.map(c=>{

const flete = Number(c.v_flete || 0)

if((c.est_pago || "PENDIENTE") === "PENDIENTE")
totalPendiente += flete

return `

<tr class="fila" data-placa="${(c.placa||"").toLowerCase()}">

<td>#${c.id}</td>

<td>${c.f_doc||"---"}</td>

<td>${c.oficina||"---"}</td>

<td>${c.orig||"---"}</td>

<td>${c.dest||"---"}</td>

<td>${c.cli||"---"}</td>

<td style="font-weight:bold;color:#3b82f6">
${c.placa||""}
</td>

<td style="color:#10b981">
$${flete.toLocaleString("es-CO")}
</td>

<td>
$${Number(c.v_facturar||0).toLocaleString("es-CO")}
</td>

<td>
${c.tipo_anticipo||"---"}
</td>

<td>
$${Number(c.valor_anticipo||0).toLocaleString("es-CO")}
</td>

<td>
$${Number(c.sobre_anticipo||0).toLocaleString("es-CO")}
</td>

<td>
$${Number(c.retefuente||0).toLocaleString("es-CO")}
</td>

<td>
$${Number(c.reteica||0).toLocaleString("es-CO")}
</td>

<td style="color:#ef4444">
$${Number(c.valor_descuento||0).toLocaleString("es-CO")}
</td>

<td style="color:#10b981;font-weight:bold">
$${Number(c.saldo_a_pagar||0).toLocaleString("es-CO")}
</td>

<td>
${c.dias_sin_pagar||0}
</td>

<td>

<a href="/editar/${c.id}" style="color:#3b82f6;font-weight:bold">
LIQUIDAR
</a>

</td>

</tr>
`
}).join("")

res.send(`

<body style="background:#0f172a;color:white;font-family:sans-serif;padding:20px">

<h2 style="color:#3b82f6">YEGO SISTEMA CONTABLE</h2>

<div style="margin-bottom:20px;color:#ef4444;font-size:20px">

TOTAL POR PAGAR  
<b>$ ${totalPendiente.toLocaleString("es-CO")}</b>

</div>

<input id="buscar" placeholder="buscar placa"
style="width:100%;padding:10px;margin-bottom:15px;background:#1e293b;color:white;border:1px solid #334155">

<div style="overflow-x:auto">

<table style="width:100%;border-collapse:collapse;background:#1e293b">

<thead style="background:#1e40af">

<tr>

<th>ID</th>
<th>FECHA</th>
<th>OFICINA</th>
<th>ORIGEN</th>
<th>DESTINO</th>
<th>CLIENTE</th>
<th>PLACA</th>
<th>FLETE PAGAR</th>
<th>FACTURAR</th>
<th>TIPO ANTICIPO</th>
<th>VALOR ANT</th>
<th>SOBRE ANT</th>
<th>RETEFUENTE</th>
<th>RETEICA</th>
<th>DESCUENTO</th>
<th>SALDO</th>
<th>DIAS SIN PAGAR</th>
<th>ACCION</th>

</tr>

</thead>

<tbody>

${filas}

</tbody>

</table>

</div>

<script>

document.getElementById("buscar").addEventListener("input",e=>{

const t = e.target.value.toLowerCase()

document.querySelectorAll(".fila").forEach(f=>{

f.style.display =
f.dataset.placa.includes(t) ? "" : "none"

})

})

</script>

</body>

`)

}catch(e){

res.send(e.message)

}

})

/* =============================
   FORMULARIO EDICION
============================= */

app.get('/editar/:id', async(req,res)=>{

const [f] = await Finanza.findOrCreate({
where:{ cargaId:req.params.id }
})

res.send(`

<body style="background:#0f172a;color:white;font-family:sans-serif;padding:40px">

<h2>Editar carga #${req.params.id}</h2>

<form method="POST" action="/guardar/${req.params.id}">

<label>Flete pagar</label><br>
<input name="v_flete" value="${f.v_flete}"><br><br>

<label>Flete facturar</label><br>
<input name="v_facturar" value="${f.v_facturar}"><br><br>

<label>Valor anticipo</label><br>
<input name="valor_anticipo" value="${f.valor_anticipo}"><br><br>

<label>ReteFuente</label><br>
<input name="retefuente" value="${f.retefuente}"><br><br>

<label>ReteICA</label><br>
<input name="reteica" value="${f.reteica}"><br><br>

<label>Descuento</label><br>
<input name="valor_descuento" value="${f.valor_descuento}"><br><br>

<label>Saldo pagar</label><br>
<input name="saldo_a_pagar" value="${f.saldo_a_pagar}"><br><br>

<label>Dias sin pagar</label><br>
<input name="dias_sin_pagar" value="${f.dias_sin_pagar}"><br><br>

<button type="submit">Guardar</button>

</form>

</body>

`)
})

/* =============================
   GUARDAR
============================= */

app.post('/guardar/:id', async(req,res)=>{

await Finanza.update(
req.body,
{ where:{ cargaId:req.params.id } }
)

res.redirect('/')

})

/* =============================
   SERVIDOR
============================= */

const PORT = process.env.PORT || 3000

db.sync().then(()=>{

app.listen(PORT,()=>{

console.log("🚀 YEGO SISTEMA INICIADO")

})

})
