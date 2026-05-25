export default function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    status: "ok",
    service: "parental-control-backend",
    vercel: Boolean(process.env.VERCEL)
  });
}
