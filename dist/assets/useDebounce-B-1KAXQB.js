import{r as o}from"./vendor-D9tkRSBZ.js";const n=(e,t=400)=>{const[r,s]=o.useState(e);return o.useEffect(()=>{const c=setTimeout(()=>s(e),t);return()=>clearTimeout(c)},[e,t]),r};export{n as u};
