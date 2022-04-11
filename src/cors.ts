
// Define sane headers values
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400"
};

export default function(request: Request) {
  const { searchParams } = new URL(request.url);
  let origin = '*;'
  switch (searchParams.get('n')) {
    case 'localhost':
      origin = 'http://localhost:3000';
      break;
    case 'hack':
      origin = 'https://hack.solidjs.com';
      break;
    case 'playground':
      origin = 'https://playground.solidjs.com';
      break;
  }
  return {
    "Access-Control-Allow-Origin": origin,
    ...corsHeaders
  };
}
