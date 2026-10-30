const boardHost = host => host === 'pin.it' || host === 'pinterest.com' || host.endsWith('.pinterest.com');
async function limitedBody(response, maximum) {
  const reader=response.body.getReader();const chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maximum)throw new Error('Pinterest response is too large.');chunks.push(value);}}
  finally {await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks);
}
export async function GET(request) {
  try {
    const params=new URL(request.url).searchParams;
    if(params.has('image')){
      const image=new URL(params.get('image'));
      if(image.protocol!=='https:'||image.hostname!=='i.pinimg.com'||image.username||image.password)throw new Error('Use a Pinterest image URL.');
      const response=await fetch(image,{redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Pinterest image is unavailable.');
      return new Response(await limitedBody(response,25*1024*1024),{headers:{'Content-Type':response.headers.get('content-type'),'Cache-Control':'public, max-age=86400'}});
    }
    let url=new URL(params.get('url'));let response;
    for(let i=0;i<7;i++){
      if(url.protocol!=='https:'||!boardHost(url.hostname)||url.username||url.password)throw new Error('Use an HTTPS Pinterest pin or board link.');
      response=await fetch(url,{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(15000)});
      if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)throw new Error('Invalid Pinterest redirect.');url=new URL(location,url);continue;}
      break;
    }
    if(!response?.ok)throw new Error('Pinterest is unavailable or requires sign-in.');
    const html=(await limitedBody(response,8*1024*1024)).toString('utf8');
    let images=[...new Set(html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-f0-9/]+\.(?:jpg|jpeg|png|webp)(?=["\\])/g)||[])];
    if(!images.length)images=[...new Set(html.match(/https:\/\/i\.pinimg\.com\/736x\/[a-f0-9/]+\.(?:jpg|jpeg|png|webp)(?=["\\])/g)||[])];
    if(!images.length)throw new Error('No accessible images found. Use a public pin or board, or upload photos directly.');
    return Response.json({source:url.href,images:images.slice(0,100),note:'Images available in the initial public page; private boards and additional pages may require direct uploads.'});
  } catch(error){return Response.json({error:error.message||'Pinterest import failed.'},{status:400});}
}
