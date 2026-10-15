(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,112413,e=>{"use strict";var t=e.i(739589),r=e.i(500965),i=e.i(270304),o=e.i(427154),n=e.i(779283);let a=(0,t.proxy)({message:"",variant:"info",open:!1}),s=(0,o.withErrorBoundary)({state:a,subscribeKey:(e,t)=>(0,r.subscribeKey)(a,e,t),open(e,t){let{debug:r}=n.OptionsController.state,{code:o,displayMessage:s,debugMessage:l}=e;if(s&&r&&(a.message=s,a.variant=t,a.open=!0),l){if(!i.ConstantsUtil.IS_DEVELOPMENT)return;let e="function"==typeof l?l():l,r=o?{code:o}:void 0;"error"===t?console.error(e,r):"warning"===t?console.warn(e,r):console.info(e,r)}},warn(e,t,r){a.open=!0,a.message=e,a.variant="warning",t&&console.warn(t,r)},close(){a.open=!1,a.message="",a.variant="info"}});e.s(["AlertController",0,s])},579367,954155,e=>{"use strict";var t=e.i(739589),r=e.i(500965),i=e.i(176207),o=e.i(845978),n=e.i(297517),a=e.i(416155),s=e.i(230091),l=e.i(779283);let c={eip155:{native:{assetNamespace:"slip44",assetReference:"60"},defaultTokenNamespace:"erc20"},solana:{native:{assetNamespace:"slip44",assetReference:"501"},defaultTokenNamespace:"token"}},u={56:"714",204:"714"};class d extends Error{}async function p(e,t){let r=function(){let{sdkType:e,sdkVersion:t,projectId:r}=l.OptionsController.getSnapshot(),i=new URL("https://rpc.walletconnect.org/v1/json-rpc");return i.searchParams.set("projectId",r),i.searchParams.set("st",e),i.searchParams.set("sv",t),i.searchParams.set("source","fund-wallet"),i.toString()}(),{projectId:i}=l.OptionsController.getSnapshot(),o={jsonrpc:"2.0",id:1,method:e,params:{...t||{},projectId:i}},n=await fetch(r,{method:"POST",body:JSON.stringify(o),headers:{"Content-Type":"application/json"}}),a=await n.json();if(a.error)throw new d(a.error.message);return a}async function h(e){return(await p("reown_getExchanges",e)).result}async function m(e){return(await p("reown_getExchangePayUrl",e)).result}async function g(e){return(await p("reown_getExchangeBuyStatus",e)).result}function f(e,t){let{chainNamespace:r,chainId:i}=s.ParseUtil.parseCaipNetworkId(e),o=c[r];if(!o)throw Error(`Unsupported chain namespace for CAIP-19 formatting: ${r}`);let n=o.native.assetNamespace,a=o.native.assetReference;"native"!==t?(n=o.defaultTokenNamespace,a=t):"eip155"===r&&u[i]&&(a=u[i]);let l=`${r}:${i}`;return`${l}/${n}:${a}`}let y={network:"eip155:8453",asset:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},b={ethereumETH:{network:"eip155:1",asset:"native",metadata:{name:"Ethereum",symbol:"ETH",decimals:18}},baseETH:{network:"eip155:8453",asset:"native",metadata:{name:"Ethereum",symbol:"ETH",decimals:18}},baseUSDC:y,baseSepoliaETH:{network:"eip155:84532",asset:"native",metadata:{name:"Ethereum",symbol:"ETH",decimals:18}},ethereumUSDC:{network:"eip155:1",asset:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},arbitrumUSDC:{network:"eip155:42161",asset:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},polygonUSDC:{network:"eip155:137",asset:"0x2791bca1f2de4661ed88a30c99a7a9449aa84174",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},solanaUSDC:{network:"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",asset:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},ethereumUSDT:{network:"eip155:1",asset:"0xdAC17F958D2ee523a2206206994597C13D831ec7",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},optimismUSDT:{network:"eip155:10",asset:"0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},arbitrumUSDT:{network:"eip155:42161",asset:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},polygonUSDT:{network:"eip155:137",asset:"0xc2132d05d31c914a87c6611c10748aeb04b58e8f",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},solanaUSDT:{network:"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",asset:"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},solanaSOL:{network:"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",asset:"native",metadata:{name:"Solana",symbol:"SOL",decimals:9}}};function w(e){return Object.values(b).filter(t=>t.network===e)}e.s(["baseSepoliaUSDC",0,{network:"eip155:84532",asset:"0x036CbD53842c5426634e7929541eC2318f3dCF7e",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},"baseUSDC",0,y,"formatCaip19Asset",0,f,"getBuyStatus",0,g,"getExchanges",0,h,"getPayUrl",0,m,"getPaymentAssetsForNetwork",0,w],954155);var v=e.i(770692),x=e.i(905698),E=e.i(882572),$=e.i(890596);let C={paymentAsset:null,amount:null,tokenAmount:0,priceLoading:!1,error:null,exchanges:[],isLoading:!1,currentPayment:void 0,isPaymentInProgress:!1,paymentId:"",assets:[]},T=(0,t.proxy)(C),S={state:T,subscribe:e=>(0,t.subscribe)(T,()=>e(T)),subscribeKey:(e,t)=>(0,r.subscribeKey)(T,e,t),resetState(){Object.assign(T,{...C})},async getAssetsForNetwork(e){let t=w(e),r=await S.getAssetsImageAndPrice(t),i=t.map(e=>{let t="native"===e.asset?(0,o.getActiveNetworkTokenAddress)():`${e.network}:${e.asset}`,i=r.find(e=>e.fungibles?.[0]?.address?.toLowerCase()===t.toLowerCase());return{...e,price:i?.fungibles?.[0]?.price||1,metadata:{...e.metadata,iconUrl:i?.fungibles?.[0]?.iconUrl}}});return T.assets=i,i},async getAssetsImageAndPrice(e){let t=e.map(e=>"native"===e.asset?(0,o.getActiveNetworkTokenAddress)():`${e.network}:${e.asset}`);return await Promise.all(t.map(e=>v.BlockchainApiController.fetchTokenPrice({addresses:[e]})))},getTokenAmount(){if(!T?.paymentAsset?.price)throw Error("Cannot get token price");let e=i.NumberUtil.bigNumber(T.amount??0).round(8),t=i.NumberUtil.bigNumber(T.paymentAsset.price).round(8);return e.div(t).round(8).toNumber()},setAmount(e){T.amount=e,T.paymentAsset?.price&&(T.tokenAmount=S.getTokenAmount())},setPaymentAsset(e){T.paymentAsset=e},isPayWithExchangeEnabled:()=>l.OptionsController.state.remoteFeatures?.payWithExchange,isPayWithExchangeSupported:()=>S.isPayWithExchangeEnabled()&&x.ChainController.state.activeCaipNetwork&&n.ConstantsUtil.PAY_WITH_EXCHANGE_SUPPORTED_CHAIN_NAMESPACES.includes(x.ChainController.state.activeCaipNetwork.chainNamespace),async fetchExchanges(){try{let e=S.isPayWithExchangeSupported();if(!T.paymentAsset||!e){T.exchanges=[],T.isLoading=!1;return}T.isLoading=!0;let t=await h({page:0,asset:f(T.paymentAsset.network,T.paymentAsset.asset),amount:T.amount?.toString()??"0"});T.exchanges=t.exchanges.slice(0,2)}catch(e){throw $.SnackController.showError("Unable to get exchanges"),Error("Unable to get exchanges")}finally{T.isLoading=!1}},async getPayUrl(e,t){try{let r=Number(t.amount),i=await m({exchangeId:e,asset:f(t.network,t.asset),amount:r.toString(),recipient:`${t.network}:${t.recipient}`});return E.EventsController.sendEvent({type:"track",event:"PAY_EXCHANGE_SELECTED",properties:{exchange:{id:e},configuration:{network:t.network,asset:t.asset,recipient:t.recipient,amount:r},currentPayment:{type:"exchange",exchangeId:e},source:"fund-from-exchange",headless:!1}}),i}catch(e){if(e instanceof Error&&e.message.includes("is not supported"))throw Error("Asset not supported");throw Error(e.message)}},async handlePayWithExchange(e){try{let t=x.ChainController.getAccountData()?.address;if(!t)throw Error("No account connected");if(!T.paymentAsset)throw Error("No payment asset selected");let r=a.CoreHelperUtil.returnOpenHref("","popupWindow","scrollbar=yes,width=480,height=720");if(!r)throw Error("Could not create popup window");T.isPaymentInProgress=!0,T.paymentId=crypto.randomUUID(),T.currentPayment={type:"exchange",exchangeId:e};let{network:i,asset:o}=T.paymentAsset,n={network:i,asset:o,amount:T.tokenAmount,recipient:t},s=await S.getPayUrl(e,n);if(!s){try{r.close()}catch(e){console.error("Unable to close popup window",e)}throw Error("Unable to initiate payment")}T.currentPayment.sessionId=s.sessionId,T.currentPayment.status="IN_PROGRESS",T.currentPayment.exchangeId=e,r.location.href=s.url}catch(e){T.error="Unable to initiate payment",$.SnackController.showError(T.error)}},async waitUntilComplete({exchangeId:e,sessionId:t,paymentId:r,retries:i=20}){let o=await S.getBuyStatus(e,t,r);if("SUCCESS"===o.status||"FAILED"===o.status)return o;if(0===i)throw Error("Unable to get deposit status");return await new Promise(e=>{setTimeout(e,5e3)}),S.waitUntilComplete({exchangeId:e,sessionId:t,paymentId:r,retries:i-1})},async getBuyStatus(e,t,r){try{if(!T.currentPayment)throw Error("No current payment");let i=await g({sessionId:t,exchangeId:e});if(T.currentPayment.status=i.status,"SUCCESS"===i.status||"FAILED"===i.status){let e=x.ChainController.getAccountData()?.address;T.currentPayment.result=i.txHash,T.isPaymentInProgress=!1,E.EventsController.sendEvent({type:"track",event:"SUCCESS"===i.status?"PAY_SUCCESS":"PAY_ERROR",properties:{message:"FAILED"===i.status?a.CoreHelperUtil.parseError(T.error):void 0,source:"fund-from-exchange",paymentId:r,configuration:{network:T.paymentAsset?.network||"",asset:T.paymentAsset?.asset||"",recipient:e||"",amount:T.amount??0},currentPayment:{type:"exchange",exchangeId:T.currentPayment?.exchangeId,sessionId:T.currentPayment?.sessionId,result:i.txHash}}})}return i}catch(e){return{status:"UNKNOWN",txHash:""}}},reset(){T.currentPayment=void 0,T.isPaymentInProgress=!1,T.paymentId="",T.paymentAsset=null,T.amount=0,T.tokenAmount=0,T.priceLoading=!1,T.error=null,T.exchanges=[],T.isLoading=!1}};e.s(["ExchangeController",0,S],579367)},336646,e=>{"use strict";e.i(195126);var t,r,i=e.i(641449),o=e.i(518444);e.i(775353);var n=e.i(772072),a=e.i(601908),s=e.i(586295),l=e.i(653462),c=e.i(448036),u=e.i(454090);s.default.extend(c.default),s.default.extend(u.default);let d={...l.default,name:"en-web3-modal",relativeTime:{future:"in %s",past:"%s ago",s:"%d sec",m:"1 min",mm:"%d min",h:"1 hr",hh:"%d hrs",d:"1 d",dd:"%d d",M:"1 mo",MM:"%d mo",y:"1 yr",yy:"%d yr"}},p=["January","February","March","April","May","June","July","August","September","October","November","December"];s.default.locale("en-web3-modal",d);var h=e.i(905698),m=e.i(416155),g=e.i(882572),f=e.i(779283),y=e.i(698859),b=e.i(210322),w=e.i(845978);e.i(656308);var v=e.i(303574);let x=["receive","deposit","borrow","claim"],E=["withdraw","repay","burn"],$={getTransactionGroupTitle(e,t){let r=((e=new Date().toISOString())=>(0,s.default)(e).year())(),i=p[t];return e===r?i:`${i} ${e}`},getTransactionImages(e){let[t]=e;return e?.length>1?e.map(e=>this.getTransactionImage(e)):[this.getTransactionImage(t)]},getTransactionImage:e=>({type:$.getTransactionTransferTokenType(e),url:$.getTransactionImageURL(e)}),getTransactionImageURL(e){let t,r=!!e?.nft_info,i=!!e?.fungible_info;return e&&r?t=e?.nft_info?.content?.preview?.url:e&&i&&(t=e?.fungible_info?.icon?.url),t},getTransactionTransferTokenType:e=>e?.fungible_info?"FUNGIBLE":e?.nft_info?"NFT":void 0,getTransactionDescriptions(e,t){let r=e?.metadata?.operationType,i=t||e?.transfers,o=i&&i.length>0,n=i&&i.length>1,a=o&&i.every(e=>!!e?.fungible_info),[s,l]=i||[],c=this.getTransferDescription(s),u=this.getTransferDescription(l);if(!o)return("send"===r||"receive"===r)&&a?[c=v.UiHelperUtil.getTruncateString({string:e?.metadata.sentFrom,charsStart:4,charsEnd:6,truncate:"middle"}),v.UiHelperUtil.getTruncateString({string:e?.metadata.sentTo,charsStart:4,charsEnd:6,truncate:"middle"})]:[e.metadata.status];if(n)return i?.map(e=>this.getTransferDescription(e));let d="";return x.includes(r)?d="+":E.includes(r)&&(d="-"),[c=d.concat(c)]},getTransferDescription(e){let t="";return e&&(e?.nft_info?t=e?.nft_info?.name||"-":e?.fungible_info&&(t=this.getFungibleTransferDescription(e)||"-")),t},getFungibleTransferDescription(e){return e?[this.getQuantityFixedValue(e?.quantity.numeric),e?.fungible_info?.symbol].join(" ").trim():null},mergeTransfers(e){if(e?.length<=1)return e;let t=this.filterGasFeeTransfers(e).reduce((e,t)=>{let r=t?.fungible_info?.name,i=e.find(({fungible_info:e,direction:i})=>r&&r===e?.name&&i===t.direction);if(i){let e=Number(i.quantity.numeric)+Number(t.quantity.numeric);i.quantity.numeric=e.toString(),i.value=(i.value||0)+(t.value||0)}else e.push(t);return e},[]),r=t;return t.length>2&&(r=t.sort((e,t)=>(t.value||0)-(e.value||0)).slice(0,2)),r=r.sort((e,t)=>"out"===e.direction&&"in"===t.direction?-1:+("in"===e.direction&&"out"===t.direction))},filterGasFeeTransfers(e){let t=e?.reduce((e,t)=>{let r=t?.fungible_info?.name;return r&&(e[r]||(e[r]=[]),e[r].push(t)),e},{}),r=[];return Object.values(t??{}).forEach(e=>{if(1===e.length){let t=e[0];t&&r.push(t)}else{let t=e.filter(e=>"in"===e.direction),i=e.filter(e=>"out"===e.direction);if(1===t.length&&1===i.length){let o=t[0],n=i[0],a=!1;if(o&&n){let e=Number(o.quantity.numeric),t=Number(n.quantity.numeric);t<.1*e?(r.push(o),a=!0):e<.1*t&&(r.push(n),a=!0)}a||r.push(...e)}else{let t=this.filterGasFeesFromTokenGroup(e);r.push(...t)}}}),e?.forEach(e=>{e?.fungible_info?.name||r.push(e)}),r},filterGasFeesFromTokenGroup(e){if(e.length<=1)return e;let t=e?.map(e=>Number(e.quantity.numeric)),r=Math.max(...t);if(Math.min(...t)<.01*r)return e?.filter(e=>Number(e.quantity.numeric)>=.01*r);let i=e?.filter(e=>"in"===e.direction),o=e?.filter(e=>"out"===e.direction);if(1===i.length&&1===o.length){let e=i[0],t=o[0];if(e&&t){let r=Number(e.quantity.numeric),i=Number(t.quantity.numeric);if(i<.1*r)return[e];if(r<.1*i)return[t]}}return e},getQuantityFixedValue:e=>e?parseFloat(e).toFixed(3):null};var C=e.i(283154);e.i(936201),e.i(816092),e.i(458052),e.i(373146);var T=i;e.i(171831);var S=e.i(818153);e.i(499488);var k=e.i(603380);(t=r||(r={})).approve="approved",t.bought="bought",t.borrow="borrowed",t.burn="burnt",t.cancel="canceled",t.claim="claimed",t.deploy="deployed",t.deposit="deposited",t.execute="executed",t.mint="minted",t.receive="received",t.repay="repaid",t.send="sent",t.sell="sold",t.stake="staked",t.trade="swapped",t.unstake="unstaked",t.withdraw="withdrawn";var O=i;e.i(849388),e.i(800808),e.i(311792);var R=e.i(67988);let P=R.css`
  :host > wui-flex {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 40px;
    height: 40px;
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.core.glass010};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  :host([data-no-images='true']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[3]} !important;
  }

  :host > wui-flex wui-image {
    display: block;
  }

  :host > wui-flex,
  :host > wui-flex wui-image,
  .swap-images-container,
  .swap-images-container.nft,
  wui-image.nft {
    border-top-left-radius: var(--local-left-border-radius);
    border-top-right-radius: var(--local-right-border-radius);
    border-bottom-left-radius: var(--local-left-border-radius);
    border-bottom-right-radius: var(--local-right-border-radius);
  }

  .swap-images-container {
    position: relative;
    width: 40px;
    height: 40px;
    overflow: hidden;
  }

  .swap-images-container wui-image:first-child {
    position: absolute;
    width: 40px;
    height: 40px;
    top: 0;
    left: 0%;
    clip-path: inset(0px calc(50% + 2px) 0px 0%);
  }

  .swap-images-container wui-image:last-child {
    clip-path: inset(0px 0px 0px calc(50% + 2px));
  }

  .swap-fallback-container {
    position: absolute;
    inset: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .swap-fallback-container.first {
    clip-path: inset(0px calc(50% + 2px) 0px 0%);
  }

  .swap-fallback-container.last {
    clip-path: inset(0px 0px 0px calc(50% + 2px));
  }

  wui-flex.status-box {
    position: absolute;
    right: 0;
    bottom: 0;
    transform: translate(20%, 20%);
    border-radius: ${({borderRadius:e})=>e[4]};
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.theme.backgroundPrimary};
    overflow: hidden;
    width: 16px;
    height: 16px;
  }
`;var A=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let I=class extends O.LitElement{constructor(){super(...arguments),this.images=[],this.secondImage={type:void 0,url:""},this.failedImageUrls=new Set}handleImageError(e){return t=>{t.stopPropagation(),this.failedImageUrls.add(e),this.requestUpdate()}}render(){let[e,t]=this.images;this.images.length||(this.dataset.noImages="true");let r=e?.type==="NFT",i=t?.url?"NFT"===t.type:r;return this.style.cssText=`
    --local-left-border-radius: ${r?"var(--apkt-borderRadius-3)":"var(--apkt-borderRadius-5)"};
    --local-right-border-radius: ${i?"var(--apkt-borderRadius-3)":"var(--apkt-borderRadius-5)"};
    `,o.html`<wui-flex> ${this.templateVisual()} ${this.templateIcon()} </wui-flex>`}templateVisual(){let[e,t]=this.images;return 2===this.images.length&&(e?.url||t?.url)?this.renderSwapImages(e,t):e?.url&&!this.failedImageUrls.has(e.url)?this.renderSingleImage(e):e?.type==="NFT"?this.renderPlaceholderIcon("nftPlaceholder"):this.renderPlaceholderIcon("coinPlaceholder")}renderSwapImages(e,t){return o.html`<div class="swap-images-container">
      ${e?.url?this.renderImageOrFallback(e,"first",!0):null}
      ${t?.url?this.renderImageOrFallback(t,"last",!0):null}
    </div>`}renderSingleImage(e){return this.renderImageOrFallback(e,void 0,!1)}renderImageOrFallback(e,t,r=!1){return e.url?this.failedImageUrls.has(e.url)?r&&t?this.renderFallbackIconInContainer(t):this.renderFallbackIcon():o.html`<wui-image
      src=${e.url}
      alt="Transaction image"
      @onLoadError=${this.handleImageError(e.url)}
    ></wui-image>`:null}renderFallbackIconInContainer(e){return o.html`<div class="swap-fallback-container ${e}">${this.renderFallbackIcon()}</div>`}renderFallbackIcon(){return o.html`<wui-icon
      size="xl"
      weight="regular"
      color="default"
      name="networkPlaceholder"
    ></wui-icon>`}renderPlaceholderIcon(e){return o.html`<wui-icon size="xl" weight="regular" color="default" name=${e}></wui-icon>`}templateIcon(){let e,t="accent-primary";return(e=this.getIcon(),this.status&&(t=this.getStatusColor()),e)?o.html`
      <wui-flex alignItems="center" justifyContent="center" class="status-box">
        <wui-icon-box size="sm" color=${t} icon=${e}></wui-icon-box>
      </wui-flex>
    `:null}getDirectionIcon(){switch(this.direction){case"in":return"arrowBottom";case"out":return"arrowTop";default:return}}getIcon(){return this.onlyDirectionIcon?this.getDirectionIcon():"trade"===this.type?"swapHorizontal":"approve"===this.type?"checkmark":"cancel"===this.type?"close":this.getDirectionIcon()}getStatusColor(){switch(this.status){case"confirmed":return"success";case"failed":return"error";case"pending":return"inverse";default:return"accent-primary"}}};I.styles=[P],A([(0,n.property)()],I.prototype,"type",void 0),A([(0,n.property)()],I.prototype,"status",void 0),A([(0,n.property)()],I.prototype,"direction",void 0),A([(0,n.property)({type:Boolean})],I.prototype,"onlyDirectionIcon",void 0),A([(0,n.property)({type:Array})],I.prototype,"images",void 0),A([(0,n.property)({type:Object})],I.prototype,"secondImage",void 0),A([(0,a.state)()],I.prototype,"failedImageUrls",void 0),I=A([(0,C.customElement)("wui-transaction-visual")],I);let N=R.css`
  :host {
    width: 100%;
  }

  :host > wui-flex:first-child {
    align-items: center;
    column-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    width: 100%;
  }

  :host > wui-flex:first-child wui-text:nth-child(1) {
    text-transform: capitalize;
  }

  wui-transaction-visual {
    width: 40px;
    height: 40px;
  }

  wui-flex {
    flex: 1;
  }

  :host wui-flex wui-flex {
    overflow: hidden;
  }

  :host .description-container wui-text span {
    word-break: break-all;
  }

  :host .description-container wui-text {
    overflow: hidden;
  }

  :host .description-separator-icon {
    margin: 0px 6px;
  }

  :host wui-text > span {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
`;var _=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let D=class extends T.LitElement{constructor(){super(...arguments),this.type="approve",this.onlyDirectionIcon=!1,this.images=[]}render(){return o.html`
      <wui-flex>
        <wui-transaction-visual
          .status=${this.status}
          direction=${(0,S.ifDefined)(this.direction)}
          type=${this.type}
          .onlyDirectionIcon=${this.onlyDirectionIcon}
          .images=${this.images}
        ></wui-transaction-visual>
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="lg-medium" color="primary">
            ${r[this.type]||this.type}
          </wui-text>
          <wui-flex class="description-container">
            ${this.templateDescription()} ${this.templateSecondDescription()}
          </wui-flex>
        </wui-flex>
        <wui-text variant="sm-medium" color="secondary"><span>${this.date}</span></wui-text>
      </wui-flex>
    `}templateDescription(){let e=this.descriptions?.[0];return e?o.html`
          <wui-text variant="md-regular" color="secondary">
            <span>${e}</span>
          </wui-text>
        `:null}templateSecondDescription(){let e=this.descriptions?.[1];return e?o.html`
          <wui-icon class="description-separator-icon" size="sm" name="arrowRight"></wui-icon>
          <wui-text variant="md-regular" color="secondary">
            <span>${e}</span>
          </wui-text>
        `:null}};D.styles=[k.resetStyles,N],_([(0,n.property)()],D.prototype,"type",void 0),_([(0,n.property)({type:Array})],D.prototype,"descriptions",void 0),_([(0,n.property)()],D.prototype,"date",void 0),_([(0,n.property)({type:Boolean})],D.prototype,"onlyDirectionIcon",void 0),_([(0,n.property)()],D.prototype,"status",void 0),_([(0,n.property)()],D.prototype,"direction",void 0),_([(0,n.property)({type:Array})],D.prototype,"images",void 0),D=_([(0,C.customElement)("wui-transaction-list-item")],D);var z=i;e.i(412401),e.i(177807);var U=i;let j=R.css`
  wui-flex {
    position: relative;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e[128]};
  }

  .fallback-icon {
    color: ${({tokens:e})=>e.theme.iconInverse};
    border-radius: ${({borderRadius:e})=>e[3]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .direction-icon,
  .status-image {
    position: absolute;
    right: 0;
    bottom: 0;
    border-radius: ${({borderRadius:e})=>e[128]};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  .direction-icon {
    padding: ${({spacing:e})=>e["01"]};
    color: ${({tokens:e})=>e.core.iconSuccess};

    background-color: color-mix(
      in srgb,
      ${({tokens:e})=>e.core.textSuccess} 30%,
      ${({tokens:e})=>e.theme.backgroundPrimary} 70%
    );
  }

  /* -- Sizes --------------------------------------------------- */
  :host([data-size='sm']) > wui-image:not(.status-image),
  :host([data-size='sm']) > wui-flex {
    width: 24px;
    height: 24px;
  }

  :host([data-size='lg']) > wui-image:not(.status-image),
  :host([data-size='lg']) > wui-flex {
    width: 40px;
    height: 40px;
  }

  :host([data-size='sm']) .fallback-icon {
    height: 16px;
    width: 16px;
    padding: ${({spacing:e})=>e[1]};
  }

  :host([data-size='lg']) .fallback-icon {
    height: 32px;
    width: 32px;
    padding: ${({spacing:e})=>e[1]};
  }

  :host([data-size='sm']) .direction-icon,
  :host([data-size='sm']) .status-image {
    transform: translate(40%, 30%);
  }

  :host([data-size='lg']) .direction-icon,
  :host([data-size='lg']) .status-image {
    transform: translate(40%, 10%);
  }

  :host([data-size='sm']) .status-image {
    height: 14px;
    width: 14px;
  }

  :host([data-size='lg']) .status-image {
    height: 20px;
    width: 20px;
  }

  /* -- Crop effects --------------------------------------------------- */
  .swap-crop-left-image,
  .swap-crop-right-image {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  .swap-crop-left-image {
    left: 0;
    clip-path: inset(0px calc(50% + 1.5px) 0px 0%);
  }

  .swap-crop-right-image {
    right: 0;
    clip-path: inset(0px 0px 0px calc(50% + 1.5px));
  }
`;var M=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let L={sm:"xxs",lg:"md"},B=class extends U.LitElement{constructor(){super(...arguments),this.type="approve",this.size="lg",this.statusImageUrl="",this.images=[]}render(){return o.html`<wui-flex>${this.templateVisual()} ${this.templateIcon()}</wui-flex>`}templateVisual(){switch(this.dataset.size=this.size,this.type){case"trade":return this.swapTemplate();case"fiat":return this.fiatTemplate();case"unknown":return this.unknownTemplate();default:return this.tokenTemplate()}}swapTemplate(){let[e,t]=this.images;return 2===this.images.length&&(e||t)?o.html`
        <wui-image class="swap-crop-left-image" src=${e} alt="Swap image"></wui-image>
        <wui-image class="swap-crop-right-image" src=${t} alt="Swap image"></wui-image>
      `:e?o.html`<wui-image src=${e} alt="Swap image"></wui-image>`:null}fiatTemplate(){return o.html`<wui-icon
      class="fallback-icon"
      size=${L[this.size]}
      name="dollar"
    ></wui-icon>`}unknownTemplate(){return o.html`<wui-icon
      class="fallback-icon"
      size=${L[this.size]}
      name="questionMark"
    ></wui-icon>`}tokenTemplate(){let[e]=this.images;return e?o.html`<wui-image src=${e} alt="Token image"></wui-image> `:o.html`<wui-icon
      class="fallback-icon"
      name=${"nft"===this.type?"image":"coinPlaceholder"}
    ></wui-icon>`}templateIcon(){return this.statusImageUrl?o.html`<wui-image
        class="status-image"
        src=${this.statusImageUrl}
        alt="Status image"
      ></wui-image>`:o.html`<wui-icon
      class="direction-icon"
      size=${L[this.size]}
      name=${this.getTemplateIcon()}
    ></wui-icon>`}getTemplateIcon(){return"trade"===this.type?"arrowClockWise":"arrowBottom"}};B.styles=[j],M([(0,n.property)()],B.prototype,"type",void 0),M([(0,n.property)()],B.prototype,"size",void 0),M([(0,n.property)()],B.prototype,"statusImageUrl",void 0),M([(0,n.property)({type:Array})],B.prototype,"images",void 0),B=M([(0,C.customElement)("wui-transaction-thumbnail")],B);let H=R.css`
  :host > wui-flex:first-child {
    gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
  }

  wui-flex {
    display: flex;
    flex: 1;
  }
`,F=class extends z.LitElement{render(){return o.html`
      <wui-flex alignItems="center" .padding=${["1","2","1","2"]}>
        <wui-shimmer width="40px" height="40px" rounded></wui-shimmer>
        <wui-flex flexDirection="column" gap="1">
          <wui-shimmer width="124px" height="16px" rounded></wui-shimmer>
          <wui-shimmer width="60px" height="14px" rounded></wui-shimmer>
        </wui-flex>
        <wui-shimmer width="24px" height="12px" rounded></wui-shimmer>
      </wui-flex>
    `}};F.styles=[k.resetStyles,H],F=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a}([(0,C.customElement)("wui-transaction-list-item-loader")],F);var q=e.i(164776);let W=R.css`
  :host {
    min-height: 100%;
  }

  .group-container[last-group='true'] {
    padding-bottom: ${({spacing:e})=>e["3"]};
  }

  .contentContainer {
    height: 280px;
  }

  .contentContainer > wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({borderRadius:e})=>e["3"]};
  }

  .contentContainer > .textContent {
    width: 65%;
  }

  .emptyContainer {
    height: 100%;
  }
`;var V=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let Y="last-transaction",G=class extends i.LitElement{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.page="activity",this.caipAddress=h.ChainController.state.activeCaipAddress,this.transactionsByYear=b.TransactionsController.state.transactionsByYear,this.loading=b.TransactionsController.state.loading,this.empty=b.TransactionsController.state.empty,this.next=b.TransactionsController.state.next,b.TransactionsController.clearCursor(),this.unsubscribe.push(h.ChainController.subscribeKey("activeCaipAddress",e=>{e&&this.caipAddress!==e&&(b.TransactionsController.resetTransactions(),b.TransactionsController.fetchTransactions(e)),this.caipAddress=e}),h.ChainController.subscribeKey("activeCaipNetwork",()=>{this.updateTransactionView()}),b.TransactionsController.subscribe(e=>{this.transactionsByYear=e.transactionsByYear,this.loading=e.loading,this.empty=e.empty,this.next=e.next}))}firstUpdated(){this.updateTransactionView(),this.createPaginationObserver()}updated(){this.setPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return o.html` ${this.empty?null:this.templateTransactionsByYear()}
    ${this.loading?this.templateLoading():null}
    ${!this.loading&&this.empty?this.templateEmpty():null}`}updateTransactionView(){b.TransactionsController.resetTransactions(),this.caipAddress&&b.TransactionsController.fetchTransactions(m.CoreHelperUtil.getPlainAddress(this.caipAddress))}templateTransactionsByYear(){return Object.keys(this.transactionsByYear).sort().reverse().map(e=>{let t=parseInt(e,10),r=Array(12).fill(null).map((e,r)=>({groupTitle:$.getTransactionGroupTitle(t,r),transactions:this.transactionsByYear[t]?.[r]})).filter(({transactions:e})=>e).reverse();return r.map(({groupTitle:e,transactions:t},i)=>{let n=i===r.length-1;return t?o.html`
          <wui-flex
            flexDirection="column"
            class="group-container"
            last-group="${n?"true":"false"}"
            data-testid="month-indexes"
          >
            <wui-flex
              alignItems="center"
              flexDirection="row"
              .padding=${["2","3","3","3"]}
            >
              <wui-text variant="md-medium" color="secondary" data-testid="group-title">
                ${e}
              </wui-text>
            </wui-flex>
            <wui-flex flexDirection="column" gap="2">
              ${this.templateTransactions(t,n)}
            </wui-flex>
          </wui-flex>
        `:null})})}templateRenderTransaction(e,t){let{date:r,descriptions:i,direction:n,images:a,status:s,type:l,transfers:c,isAllNFT:u}=this.getTransactionListItemProps(e);return o.html`
      <wui-transaction-list-item
        date=${r}
        .direction=${n}
        id=${t&&this.next?Y:""}
        status=${s}
        type=${l}
        .images=${a}
        .onlyDirectionIcon=${u||1===c.length}
        .descriptions=${i}
      ></wui-transaction-list-item>
    `}templateTransactions(e,t){return e.map((r,i)=>{let n=t&&i===e.length-1;return o.html`${this.templateRenderTransaction(r,n)}`})}emptyStateActivity(){return o.html`<wui-flex
      class="emptyContainer"
      flexGrow="1"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      .padding=${["10","5","10","5"]}
      gap="5"
      data-testid="empty-activity-state"
    >
      <wui-icon-box color="default" icon="wallet" size="xl"></wui-icon-box>
      <wui-flex flexDirection="column" alignItems="center" gap="2">
        <wui-text align="center" variant="lg-medium" color="primary">No Transactions yet</wui-text>
        <wui-text align="center" variant="lg-regular" color="secondary"
          >Start trading on dApps <br />
          to grow your wallet!</wui-text
        >
      </wui-flex>
    </wui-flex>`}emptyStateAccount(){return o.html`<wui-flex
      class="contentContainer"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap="4"
      data-testid="empty-account-state"
    >
      <wui-icon-box icon="swapHorizontal" size="lg" color="default"></wui-icon-box>
      <wui-flex
        class="textContent"
        gap="2"
        flexDirection="column"
        justifyContent="center"
        flexDirection="column"
      >
        <wui-text variant="md-regular" align="center" color="primary">No activity yet</wui-text>
        <wui-text variant="sm-regular" align="center" color="secondary"
          >Your next transactions will appear here</wui-text
        >
      </wui-flex>
      <wui-link @click=${this.onReceiveClick.bind(this)}>Trade</wui-link>
    </wui-flex>`}templateEmpty(){return"account"===this.page?o.html`${this.emptyStateAccount()}`:o.html`${this.emptyStateActivity()}`}templateLoading(){return"activity"===this.page?o.html` <wui-flex flexDirection="column" width="100%">
        <wui-flex .padding=${["2","3","3","3"]}>
          <wui-shimmer width="70px" height="16px" rounded></wui-shimmer>
        </wui-flex>
        <wui-flex flexDirection="column" gap="2" width="100%">
          ${Array(7).fill(o.html` <wui-transaction-list-item-loader></wui-transaction-list-item-loader> `).map(e=>e)}
        </wui-flex>
      </wui-flex>`:null}onReceiveClick(){y.RouterController.push("WalletReceive")}createPaginationObserver(){let{projectId:e}=f.OptionsController.state;this.paginationObserver=new IntersectionObserver(([t])=>{t?.isIntersecting&&!this.loading&&(b.TransactionsController.fetchTransactions(m.CoreHelperUtil.getPlainAddress(this.caipAddress)),g.EventsController.sendEvent({type:"track",event:"LOAD_MORE_TRANSACTIONS",properties:{address:m.CoreHelperUtil.getPlainAddress(this.caipAddress),projectId:e,cursor:this.next,isSmartAccount:(0,w.getPreferredAccountType)(h.ChainController.state.activeChain)===q.W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT}}))},{}),this.setPaginationObserver()}setPaginationObserver(){this.paginationObserver?.disconnect();let e=this.shadowRoot?.querySelector(`#${Y}`);e&&this.paginationObserver?.observe(e)}getTransactionListItemProps(e){let t=((e,t="DD MMM")=>(0,s.default)(e).format(t))(e?.metadata?.minedAt),r=$.mergeTransfers(e?.transfers||[]),i=$.getTransactionDescriptions(e,r),o=r?.[0],n=!!o&&r?.every(e=>!!e.nft_info),a=$.getTransactionImages(r);return{date:t,direction:o?.direction,descriptions:i,isAllNFT:n,images:a,status:e.metadata?.status,transfers:r,type:e.metadata?.operationType}}};G.styles=W,V([(0,n.property)()],G.prototype,"page",void 0),V([(0,a.state)()],G.prototype,"caipAddress",void 0),V([(0,a.state)()],G.prototype,"transactionsByYear",void 0),V([(0,a.state)()],G.prototype,"loading",void 0),V([(0,a.state)()],G.prototype,"empty",void 0),V([(0,a.state)()],G.prototype,"next",void 0),G=V([(0,C.customElement)("w3m-activity-list")],G),e.s([],336646)},854362,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072);e.i(171831);var o=e.i(818153);e.i(849388),e.i(499488);var n=e.i(603380),a=e.i(283154);e.i(925245);var s=e.i(940697);let l=s.css`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }
`;var c=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let u=class extends t.LitElement{constructor(){super(...arguments),this.disabled=!1}render(){return r.html`
      <wui-input-text
        type="email"
        placeholder="Email"
        icon="mail"
        size="lg"
        .disabled=${this.disabled}
        .value=${this.value}
        data-testid="wui-email-input"
        tabIdx=${(0,o.ifDefined)(this.tabIdx)}
      ></wui-input-text>
      ${this.templateError()}
    `}templateError(){return this.errorMessage?r.html`<wui-text variant="sm-regular" color="error">${this.errorMessage}</wui-text>`:null}};u.styles=[n.resetStyles,l],c([(0,i.property)()],u.prototype,"errorMessage",void 0),c([(0,i.property)({type:Boolean})],u.prototype,"disabled",void 0),c([(0,i.property)()],u.prototype,"value",void 0),c([(0,i.property)()],u.prototype,"tabIdx",void 0),u=c([(0,a.customElement)("wui-email-input")],u),e.s([],854362)},816092,e=>{"use strict";e.i(311792),e.s([])},446230,36185,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072);e.i(849388);var o=e.i(603380),n=e.i(283154),a=e.i(67988);let s=a.css`
  button {
    background-color: transparent;
    padding: ${({spacing:e})=>e[1]};
  }

  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  button[data-variant='accent']:hover:enabled,
  button[data-variant='accent']:focus-visible {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  button[data-variant='primary']:hover:enabled,
  button[data-variant='primary']:focus-visible,
  button[data-variant='secondary']:hover:enabled,
  button[data-variant='secondary']:focus-visible {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button[data-size='xs'] > wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] > wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='xs'],
  button[data-size='sm'] {
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='md'],
  button[data-size='lg'] {
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='md'] > wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] > wui-icon {
    width: 20px;
    height: 20px;
  }

  button:disabled {
    background-color: transparent;
    cursor: not-allowed;
    opacity: 0.5;
  }

  button:hover:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
  }

  button:focus-visible:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
`;var l=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let c=class extends t.LitElement{constructor(){super(...arguments),this.size="md",this.disabled=!1,this.icon="copy",this.iconColor="default",this.variant="accent"}render(){return r.html`
      <button data-variant=${this.variant} ?disabled=${this.disabled} data-size=${this.size}>
        <wui-icon
          color=${({accent:"accent-primary",primary:"inverse",secondary:"default"})[this.variant]||this.iconColor}
          size=${this.size}
          name=${this.icon}
        ></wui-icon>
      </button>
    `}};c.styles=[o.resetStyles,o.elementStyles,s],l([(0,i.property)()],c.prototype,"size",void 0),l([(0,i.property)({type:Boolean})],c.prototype,"disabled",void 0),l([(0,i.property)()],c.prototype,"icon",void 0),l([(0,i.property)()],c.prototype,"iconColor",void 0),l([(0,i.property)()],c.prototype,"variant",void 0),c=l([(0,n.customElement)("wui-icon-link")],c),e.s([],36185),e.s([],446230)},880855,e=>{"use strict";e.i(925245),e.s([])},666028,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072);e.i(171831);var o=e.i(818153);e.i(486565),e.i(499488);var n=e.i(603380),a=e.i(283154),s=e.i(67988);let l=s.css`
  :host {
    width: 100%;
  }

  :host([data-type='primary']) > button {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  :host([data-type='secondary']) > button {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      scale ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, scale;
  }

  wui-text {
    text-transform: capitalize;
  }

  wui-image {
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  @media (hover: hover) {
    :host([data-type='primary']) > button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }

    :host([data-type='secondary']) > button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var c=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let u=class extends t.LitElement{constructor(){super(...arguments),this.type="primary",this.imageSrc="google",this.imageSize=void 0,this.loading=!1,this.boxColor="foregroundPrimary",this.disabled=!1,this.rightIcon=!0,this.boxed=!0,this.rounded=!1,this.fullSize=!1}render(){return this.dataset.rounded=this.rounded?"true":"false",this.dataset.type=this.type,r.html`
      <button
        ?disabled=${!!this.loading||!!this.disabled}
        data-loading=${this.loading}
        tabindex=${(0,o.ifDefined)(this.tabIdx)}
      >
        <wui-flex gap="2" alignItems="center">
          ${this.templateLeftIcon()}
          <wui-flex gap="1">
            <slot></slot>
          </wui-flex>
        </wui-flex>
        ${this.templateRightIcon()}
      </button>
    `}templateLeftIcon(){return this.icon?r.html`<wui-image
        icon=${this.icon}
        iconColor=${(0,o.ifDefined)(this.iconColor)}
        ?boxed=${this.boxed}
        ?rounded=${this.rounded}
        boxColor=${this.boxColor}
      ></wui-image>`:r.html`<wui-image
      ?boxed=${this.boxed}
      ?rounded=${this.rounded}
      ?fullSize=${this.fullSize}
      size=${(0,o.ifDefined)(this.imageSize)}
      src=${this.imageSrc}
      boxColor=${this.boxColor}
    ></wui-image>`}templateRightIcon(){return this.rightIcon?this.loading?r.html`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:r.html`<wui-icon name="chevronRight" size="lg" color="default"></wui-icon>`:null}};u.styles=[n.resetStyles,n.elementStyles,l],c([(0,i.property)()],u.prototype,"type",void 0),c([(0,i.property)()],u.prototype,"imageSrc",void 0),c([(0,i.property)()],u.prototype,"imageSize",void 0),c([(0,i.property)()],u.prototype,"icon",void 0),c([(0,i.property)()],u.prototype,"iconColor",void 0),c([(0,i.property)({type:Boolean})],u.prototype,"loading",void 0),c([(0,i.property)()],u.prototype,"tabIdx",void 0),c([(0,i.property)()],u.prototype,"boxColor",void 0),c([(0,i.property)({type:Boolean})],u.prototype,"disabled",void 0),c([(0,i.property)({type:Boolean})],u.prototype,"rightIcon",void 0),c([(0,i.property)({type:Boolean})],u.prototype,"boxed",void 0),c([(0,i.property)({type:Boolean})],u.prototype,"rounded",void 0),c([(0,i.property)({type:Boolean})],u.prototype,"fullSize",void 0),u=c([(0,a.customElement)("wui-list-item")],u),e.s([],666028)},924432,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072),o=e.i(176207);e.i(849388),e.i(800808),e.i(499488),e.i(177807);var n=e.i(603380),a=e.i(283154),s=e.i(67988);let l=s.css`
  :host {
    width: 100%;
  }

  button {
    padding: ${({spacing:e})=>e[3]};
    display: flex;
    gap: ${({spacing:e})=>e[3]};
    justify-content: space-between;
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    background-color: transparent;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  button[data-clickable='false'] {
    pointer-events: none;
    background-color: transparent;
  }

  wui-image,
  wui-icon {
    width: ${({spacing:e})=>e[10]};
    height: ${({spacing:e})=>e[10]};
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  .token-name-container {
    flex: 1;
  }
`;var c=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let u=class extends t.LitElement{constructor(){super(...arguments),this.tokenName="",this.tokenImageUrl="",this.tokenValue=0,this.tokenAmount="0.0",this.tokenCurrency="",this.clickable=!1}render(){return r.html`
      <button data-clickable=${String(this.clickable)}>
        <wui-flex gap="2" alignItems="center">
          ${this.visualTemplate()}
          <wui-flex
            flexDirection="column"
            justifyContent="space-between"
            gap="1"
            class="token-name-container"
          >
            <wui-text variant="md-regular" color="primary" lineClamp="1">
              ${this.tokenName}
            </wui-text>
            <wui-text variant="sm-regular-mono" color="secondary">
              ${o.NumberUtil.formatNumberToLocalString(this.tokenAmount,4)} ${this.tokenCurrency}
            </wui-text>
          </wui-flex>
        </wui-flex>
        <wui-flex
          flexDirection="column"
          justifyContent="space-between"
          gap="1"
          alignItems="flex-end"
          width="auto"
        >
          <wui-text variant="md-regular-mono" color="primary"
            >$${this.tokenValue.toFixed(2)}</wui-text
          >
          <wui-text variant="sm-regular-mono" color="secondary">
            ${o.NumberUtil.formatNumberToLocalString(this.tokenAmount,4)}
          </wui-text>
        </wui-flex>
      </button>
    `}visualTemplate(){return this.tokenName&&this.tokenImageUrl?r.html`<wui-image alt=${this.tokenName} src=${this.tokenImageUrl}></wui-image>`:r.html`<wui-icon name="coinPlaceholder" color="default"></wui-icon>`}};u.styles=[n.resetStyles,n.elementStyles,l],c([(0,i.property)()],u.prototype,"tokenName",void 0),c([(0,i.property)()],u.prototype,"tokenImageUrl",void 0),c([(0,i.property)({type:Number})],u.prototype,"tokenValue",void 0),c([(0,i.property)()],u.prototype,"tokenAmount",void 0),c([(0,i.property)()],u.prototype,"tokenCurrency",void 0),c([(0,i.property)({type:Boolean})],u.prototype,"clickable",void 0),u=c([(0,a.customElement)("wui-list-token")],u),e.s([],924432)},583950,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072),o=e.i(622993),n=e.i(791056);let a=r.svg`
  <svg fill="none" viewBox="0 0 36 40">
    <path
      d="M15.4 2.1a5.21 5.21 0 0 1 5.2 0l11.61 6.7a5.21 5.21 0 0 1 2.61 4.52v13.4c0 1.87-1 3.59-2.6 4.52l-11.61 6.7c-1.62.93-3.6.93-5.22 0l-11.6-6.7a5.21 5.21 0 0 1-2.61-4.51v-13.4c0-1.87 1-3.6 2.6-4.52L15.4 2.1Z"
    />
  </svg>
`;e.i(849388),e.i(800808);var s=e.i(603380),l=e.i(283154),c=e.i(67988);let u=c.css`
  :host {
    position: relative;
    border-radius: inherit;
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--local-width);
    height: var(--local-height);
  }

  :host([data-round='true']) {
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: 100%;
    outline: 1px solid ${({tokens:e})=>e.core.glass010};
  }

  svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  svg > path {
    stroke: var(--local-stroke);
  }

  wui-image {
    width: 100%;
    height: 100%;
    -webkit-clip-path: var(--local-path);
    clip-path: var(--local-path);
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-icon {
    transform: translateY(-5%);
    width: var(--local-icon-size);
    height: var(--local-icon-size);
  }
`;var d=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let p=class extends t.LitElement{constructor(){super(...arguments),this.size="md",this.name="uknown",this.networkImagesBySize={sm:a,md:n.networkSvgMd,lg:o.networkSvgLg},this.selected=!1,this.round=!1}render(){return this.round?(this.dataset.round="true",this.style.cssText=`
      --local-width: var(--apkt-spacing-10);
      --local-height: var(--apkt-spacing-10);
      --local-icon-size: var(--apkt-spacing-4);
    `):this.style.cssText=`

      --local-path: var(--apkt-path-network-${this.size});
      --local-width:  var(--apkt-width-network-${this.size});
      --local-height:  var(--apkt-height-network-${this.size});
      --local-icon-size:  var(--apkt-spacing-${({sm:"4",md:"6",lg:"10"})[this.size]});
    `,r.html`${this.templateVisual()} ${this.svgTemplate()} `}svgTemplate(){return this.round?null:this.networkImagesBySize[this.size]}templateVisual(){return this.imageSrc?r.html`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`:r.html`<wui-icon size="inherit" color="default" name="networkPlaceholder"></wui-icon>`}};p.styles=[s.resetStyles,u],d([(0,i.property)()],p.prototype,"size",void 0),d([(0,i.property)()],p.prototype,"name",void 0),d([(0,i.property)({type:Object})],p.prototype,"networkImagesBySize",void 0),d([(0,i.property)()],p.prototype,"imageSrc",void 0),d([(0,i.property)({type:Boolean})],p.prototype,"selected",void 0),d([(0,i.property)({type:Boolean})],p.prototype,"round",void 0),p=d([(0,l.customElement)("wui-network-image")],p),e.s([],583950)},451198,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072);e.i(499488);var o=e.i(603380),n=e.i(283154),a=e.i(67988);let s=a.css`
  :host {
    position: relative;
    display: flex;
    width: 100%;
    height: 1px;
    background-color: ${({tokens:e})=>e.theme.borderPrimary};
    justify-content: center;
    align-items: center;
  }

  :host > wui-text {
    position: absolute;
    padding: 0px 8px;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  :host([data-bg-color='primary']) > wui-text {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  :host([data-bg-color='secondary']) > wui-text {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }
`;var l=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let c=class extends t.LitElement{constructor(){super(...arguments),this.text="",this.bgColor="primary"}render(){return this.dataset.bgColor=this.bgColor,r.html`${this.template()}`}template(){return this.text?r.html`<wui-text variant="md-regular" color="secondary">${this.text}</wui-text>`:null}};c.styles=[o.resetStyles,s],l([(0,i.property)()],c.prototype,"text",void 0),l([(0,i.property)()],c.prototype,"bgColor",void 0),c=l([(0,n.customElement)("wui-separator")],c),e.s([],451198)},22786,e=>{"use strict";e.i(292682),e.s([])},896117,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072);e.i(171831);var o=e.i(818153);e.i(849388),e.i(800808),e.i(499488),e.i(177807);var n=e.i(603380),a=e.i(303574),s=e.i(283154),l=e.i(67988);let c=l.css`
  button {
    display: flex;
    align-items: center;
    height: 40px;
    padding: ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[4]};
    column-gap: ${({spacing:e})=>e[1]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  wui-image,
  .icon-box {
    width: ${({spacing:e})=>e[6]};
    height: ${({spacing:e})=>e[6]};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-text {
    flex: 1;
  }

  .icon-box {
    position: relative;
  }

  .icon-box[data-active='true'] {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .circle {
    position: absolute;
    left: 16px;
    top: 15px;
    width: 8px;
    height: 8px;
    background-color: ${({tokens:e})=>e.core.textSuccess};
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: 50%;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }
`;var u=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let d=class extends t.LitElement{constructor(){super(...arguments),this.address="",this.profileName="",this.alt="",this.imageSrc="",this.icon=void 0,this.iconSize="md",this.enableGreenCircle=!0,this.loading=!1,this.charsStart=4,this.charsEnd=6}render(){return r.html`
      <button>
        ${this.leftImageTemplate()} ${this.textTemplate()} ${this.rightImageTemplate()}
      </button>
    `}leftImageTemplate(){let e=this.icon?r.html`<wui-icon
          size=${(0,o.ifDefined)(this.iconSize)}
          color="default"
          name=${this.icon}
          class="icon"
        ></wui-icon>`:r.html`<wui-image src=${this.imageSrc} alt=${this.alt}></wui-image>`;return r.html`
      <wui-flex
        alignItems="center"
        justifyContent="center"
        class="icon-box"
        data-active=${!!this.icon}
      >
        ${e}
        ${this.enableGreenCircle?r.html`<wui-flex class="circle"></wui-flex>`:null}
      </wui-flex>
    `}textTemplate(){return r.html`
      <wui-text variant="lg-regular" color="primary">
        ${a.UiHelperUtil.getTruncateString({string:this.profileName||this.address,charsStart:this.profileName?16:this.charsStart,charsEnd:this.profileName?0:this.charsEnd,truncate:this.profileName?"end":"middle"})}
      </wui-text>
    `}rightImageTemplate(){return r.html`<wui-icon name="chevronBottom" size="sm" color="default"></wui-icon>`}};d.styles=[n.resetStyles,n.elementStyles,c],u([(0,i.property)()],d.prototype,"address",void 0),u([(0,i.property)()],d.prototype,"profileName",void 0),u([(0,i.property)()],d.prototype,"alt",void 0),u([(0,i.property)()],d.prototype,"imageSrc",void 0),u([(0,i.property)()],d.prototype,"icon",void 0),u([(0,i.property)()],d.prototype,"iconSize",void 0),u([(0,i.property)({type:Boolean})],d.prototype,"enableGreenCircle",void 0),u([(0,i.property)({type:Boolean})],d.prototype,"loading",void 0),u([(0,i.property)({type:Number})],d.prototype,"charsStart",void 0),u([(0,i.property)({type:Number})],d.prototype,"charsEnd",void 0),d=u([(0,s.customElement)("wui-wallet-switch")],d),e.s([],896117)},622993,e=>{"use strict";e.i(195126);var t=e.i(518444);let r=t.svg`<svg width="86" height="96" fill="none">
  <path
    d="M78.3244 18.926L50.1808 2.45078C45.7376 -0.150261 40.2624 -0.150262 35.8192 2.45078L7.6756 18.926C3.23322 21.5266 0.5 26.3301 0.5 31.5248V64.4752C0.5 69.6699 3.23322 74.4734 7.6756 77.074L35.8192 93.5492C40.2624 96.1503 45.7376 96.1503 50.1808 93.5492L78.3244 77.074C82.7668 74.4734 85.5 69.6699 85.5 64.4752V31.5248C85.5 26.3301 82.7668 21.5266 78.3244 18.926Z"
  />
</svg>`;e.s(["networkSvgLg",0,r])},791056,e=>{"use strict";e.i(195126);var t=e.i(518444);let r=t.svg`<svg  viewBox="0 0 48 54" fill="none">
  <path
    d="M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z"
  />
</svg>`;e.s(["networkSvgMd",0,r])},1868,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072);e.i(800808);var o=e.i(603380),n=e.i(303574),a=e.i(283154),s=e.i(67988);let l=s.css`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
    border-radius: ${({borderRadius:e})=>e[16]};
    overflow: hidden;
    position: relative;
  }

  :host([data-variant='generated']) {
    --mixed-local-color-1: var(--local-color-1);
    --mixed-local-color-2: var(--local-color-2);
    --mixed-local-color-3: var(--local-color-3);
    --mixed-local-color-4: var(--local-color-4);
    --mixed-local-color-5: var(--local-color-5);
  }

  :host([data-variant='generated']) {
    background: radial-gradient(
      var(--local-radial-circle),
      #fff 0.52%,
      var(--mixed-local-color-5) 31.25%,
      var(--mixed-local-color-3) 51.56%,
      var(--mixed-local-color-2) 65.63%,
      var(--mixed-local-color-1) 82.29%,
      var(--mixed-local-color-4) 100%
    );
  }

  :host([data-variant='default']) {
    background: radial-gradient(
      75.29% 75.29% at 64.96% 24.36%,
      #fff 0.52%,
      #f5ccfc 31.25%,
      #dba4f5 51.56%,
      #9a8ee8 65.63%,
      #6493da 82.29%,
      #6ebdea 100%
    );
  }
`;var c=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let u=class extends t.LitElement{constructor(){super(...arguments),this.imageSrc=void 0,this.alt=void 0,this.address=void 0,this.size="xl"}render(){let e={inherit:"inherit",xxs:"3",xs:"5",sm:"6",md:"8",mdl:"8",lg:"10",xl:"16",xxl:"20"};return this.style.cssText=`
    --local-width: var(--apkt-spacing-${e[this.size??"xl"]});
    --local-height: var(--apkt-spacing-${e[this.size??"xl"]});
    `,r.html`${this.visualTemplate()}`}visualTemplate(){if(this.imageSrc)return this.dataset.variant="image",r.html`<wui-image src=${this.imageSrc} alt=${this.alt??"avatar"}></wui-image>`;if(this.address){this.dataset.variant="generated";let e=n.UiHelperUtil.generateAvatarColors(this.address);return this.style.cssText+=`
 ${e}`,null}return this.dataset.variant="default",null}};u.styles=[o.resetStyles,l],c([(0,i.property)()],u.prototype,"imageSrc",void 0),c([(0,i.property)()],u.prototype,"alt",void 0),c([(0,i.property)()],u.prototype,"address",void 0),c([(0,i.property)()],u.prototype,"size",void 0),u=c([(0,a.customElement)("wui-avatar")],u),e.s([],1868)},925245,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072);e.i(171831);var o=e.i(818153);e.i(560589);var n=e.i(886492);e.i(849388),e.i(499488);var a=e.i(603380),s=e.i(283154),l=e.i(67988);let c=l.css`
  :host {
    position: relative;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    gap: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.textPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  .wui-input-text-container {
    position: relative;
    display: flex;
  }

  input {
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: inherit;
    background: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[3]} ${({spacing:e})=>e[10]};
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
  }

  input[data-size='lg'] {
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[4]} ${({spacing:e})=>e[10]};
  }

  @media (hover: hover) and (pointer: fine) {
    input:hover:enabled {
      border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    }
  }

  input:disabled {
    cursor: unset;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  input::placeholder {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  input:focus:enabled {
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    -webkit-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    -moz-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  div.wui-input-text-container:has(input:disabled) {
    opacity: 0.5;
  }

  wui-icon.wui-input-text-left-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    left: ${({spacing:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button.wui-input-text-submit-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: ${({borderRadius:e})=>e[2]};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button.wui-input-text-submit-button:disabled {
    opacity: 1;
  }

  button.wui-input-text-submit-button.loading wui-icon {
    animation: spin 1s linear infinite;
  }

  button.wui-input-text-submit-button:hover {
    background: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  input:has(+ .wui-input-text-submit-button) {
    padding-right: ${({spacing:e})=>e[12]};
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input[type='search']::-webkit-search-decoration,
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-results-button,
  input[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  /* -- Keyframes --------------------------------------------------- */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;var u=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let d=class extends t.LitElement{constructor(){super(...arguments),this.inputElementRef=(0,n.createRef)(),this.disabled=!1,this.loading=!1,this.placeholder="",this.type="text",this.value="",this.size="md"}render(){return r.html` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${(0,n.ref)(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${(0,o.ifDefined)(this.enterKeyHint)}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder}
          @input=${this.dispatchInputChangeEvent.bind(this)}
          @keydown=${this.onKeyDown}
          .value=${this.value||""}
        />
        ${this.templateSubmitButton()}
        <slot class="wui-input-text-slot"></slot>
      </div>
      ${this.templateError()} ${this.templateWarning()}`}templateLeftIcon(){return this.icon?r.html`<wui-icon
        class="wui-input-text-left-icon"
        size="md"
        data-size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}templateSubmitButton(){return this.onSubmit?r.html`<button
        class="wui-input-text-submit-button ${this.loading?"loading":""}"
        @click=${this.onSubmit?.bind(this)}
        ?disabled=${this.disabled||this.loading}
      >
        ${this.loading?r.html`<wui-icon name="spinner" size="md"></wui-icon>`:r.html`<wui-icon name="chevronRight" size="md"></wui-icon>`}
      </button>`:null}templateError(){return this.errorText?r.html`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`:null}templateWarning(){return this.warningText?r.html`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`:null}dispatchInputChangeEvent(){this.dispatchEvent(new CustomEvent("inputChange",{detail:this.inputElementRef.value?.value,bubbles:!0,composed:!0}))}};d.styles=[a.resetStyles,a.elementStyles,c],u([(0,i.property)()],d.prototype,"icon",void 0),u([(0,i.property)({type:Boolean})],d.prototype,"disabled",void 0),u([(0,i.property)({type:Boolean})],d.prototype,"loading",void 0),u([(0,i.property)()],d.prototype,"placeholder",void 0),u([(0,i.property)()],d.prototype,"type",void 0),u([(0,i.property)()],d.prototype,"value",void 0),u([(0,i.property)()],d.prototype,"errorText",void 0),u([(0,i.property)()],d.prototype,"warningText",void 0),u([(0,i.property)()],d.prototype,"onSubmit",void 0),u([(0,i.property)()],d.prototype,"size",void 0),u([(0,i.property)({attribute:!1})],d.prototype,"onKeyDown",void 0),d=u([(0,s.customElement)("wui-input-text")],d),e.s([],925245)},292682,e=>{"use strict";e.i(195126);var t=e.i(641449),r=e.i(518444);e.i(775353);var i=e.i(772072);e.i(849388),e.i(800808);var o=e.i(603380),n=e.i(283154);e.i(311792);var a=e.i(67988);let s=a.css`
  :host {
    position: relative;
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host([data-image='true']) {
    background-color: transparent;
  }

  :host > wui-flex {
    overflow: hidden;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host([data-size='sm']) {
    width: 32px;
    height: 32px;
  }

  :host([data-size='md']) {
    width: 40px;
    height: 40px;
  }

  :host([data-size='lg']) {
    width: 56px;
    height: 56px;
  }

  :host([name='Extension'])::after {
    border: 1px solid ${({colors:e})=>e.accent010};
  }

  :host([data-wallet-icon='allWallets'])::after {
    border: 1px solid ${({colors:e})=>e.accent010};
  }

  wui-icon[data-parent-size='inherit'] {
    width: 75%;
    height: 75%;
    align-items: center;
  }

  wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  wui-icon[data-parent-size='sm'] {
    width: 24px;
    height: 24px;
  }

  wui-icon[data-parent-size='md'] {
    width: 32px;
    height: 32px;
  }

  :host > wui-icon-box {
    position: absolute;
    overflow: hidden;
    right: -1px;
    bottom: -2px;
    z-index: 1;
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
    padding: 1px;
  }
`;var l=function(e,t,r,i){var o,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(n<3?o(a):n>3?o(t,r,a):o(t,r))||a);return n>3&&a&&Object.defineProperty(t,r,a),a};let c=class extends t.LitElement{constructor(){super(...arguments),this.size="md",this.name="",this.installed=!1,this.badgeSize="xs"}render(){let e="1";return"lg"===this.size?e="4":"md"===this.size?e="2":"sm"===this.size&&(e="1"),this.style.cssText=`
       --local-border-radius: var(--apkt-borderRadius-${e});
   `,this.dataset.size=this.size,this.imageSrc&&(this.dataset.image="true"),this.walletIcon&&(this.dataset.walletIcon=this.walletIcon),r.html`
      <wui-flex justifyContent="center" alignItems="center"> ${this.templateVisual()} </wui-flex>
    `}templateVisual(){return this.imageSrc?r.html`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`:this.walletIcon?r.html`<wui-icon size="md" color="default" name=${this.walletIcon}></wui-icon>`:r.html`<wui-icon
      data-parent-size=${this.size}
      size="inherit"
      color="inherit"
      name="wallet"
    ></wui-icon>`}};c.styles=[o.resetStyles,s],l([(0,i.property)()],c.prototype,"size",void 0),l([(0,i.property)()],c.prototype,"name",void 0),l([(0,i.property)()],c.prototype,"imageSrc",void 0),l([(0,i.property)()],c.prototype,"walletIcon",void 0),l([(0,i.property)({type:Boolean})],c.prototype,"installed",void 0),l([(0,i.property)()],c.prototype,"badgeSize",void 0),c=l([(0,n.customElement)("wui-wallet-image")],c),e.s([],292682)},780612,e=>{"use strict";let t={METMASK_CONNECTOR_NAME:"MetaMask",TRUST_CONNECTOR_NAME:"Trust Wallet",SOLFLARE_CONNECTOR_NAME:"Solflare",PHANTOM_CONNECTOR_NAME:"Phantom",COIN98_CONNECTOR_NAME:"Coin98",MAGIC_EDEN_CONNECTOR_NAME:"Magic Eden",BACKPACK_CONNECTOR_NAME:"Backpack",BITGET_CONNECTOR_NAME:"Bitget Wallet",FRONTIER_CONNECTOR_NAME:"Frontier",XVERSE_CONNECTOR_NAME:"Xverse Wallet",LEATHER_CONNECTOR_NAME:"Leather",OKX_CONNECTOR_NAME:"OKX Wallet",BINANCE_CONNECTOR_NAME:"Binance Wallet",EIP155:e.i(270304).ConstantsUtil.CHAIN.EVM,ADD_CHAIN_METHOD:"wallet_addEthereumChain",EIP6963_ANNOUNCE_EVENT:"eip6963:announceProvider",EIP6963_REQUEST_EVENT:"eip6963:requestProvider",CONNECTOR_RDNS_MAP:{coinbaseWallet:"com.coinbase.wallet",coinbaseWalletSDK:"com.coinbase.wallet"},CONNECTOR_TYPE_EXTERNAL:"EXTERNAL",CONNECTOR_TYPE_WALLET_CONNECT:"WALLET_CONNECT",CONNECTOR_TYPE_INJECTED:"INJECTED",CONNECTOR_TYPE_ANNOUNCED:"ANNOUNCED",CONNECTOR_TYPE_AUTH:"AUTH",CONNECTOR_TYPE_MULTI_CHAIN:"MULTI_CHAIN",CONNECTOR_TYPE_W3M_AUTH:"AUTH",getSDKVersionWarningMessage:(e,t)=>`
     @@@@@@@           @@@@@@@@@@@@@@@@@@      
   @@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@@   
  @@@@@@@@@@@@@    @@@@@@@@@@@@@@@@@@@@@@@@@@  
 @@@@@@@@@@@@@@@  @@@@@@@@@@@@@@@@@@@@@@@@@@@  
 @@@@@@@@@@@@@@@  @@@@@@@@@@@@@@   @@@@@@@@@@@ 
 @@@@@@@@@@@@@@@  @@@@@@@@@@@@@   @@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@  @@@@@@@@@@@@@  @@@@@@@@@@@@@
 @@@@@@@@@@@@@@@  @@@@@@@@@@@@   @@@@@@@@@@@@@    
 @@@@@@   @@@@@@  @@@@@@@@@@@   @@@@@@@@@@@@@@    
 @@@@@@   @@@@@@  @@@@@@@@@@@  @@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@  @@@@@@@@@@   @@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@  @@@@@@@@@@@@@@@@@@@@@@@@@@@  
  @@@@@@@@@@@@@    @@@@@@@@@@@@@@@@@@@@@@@@@@  
   @@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@@   
      @@@@@            @@@@@@@@@@@@@@@@@@  
      
AppKit SDK version ${e} is outdated. Latest version is ${t}. Please update to the latest version for bug fixes and new features.
            
Changelog: https://github.com/reown-com/appkit/releases
NPM Registry: https://www.npmjs.com/package/@reown/appkit`};e.s(["ConstantsUtil",0,t])},536561,e=>{"use strict";var t=e.i(270304),r=e.i(905698),i=e.i(716342),o=e.i(239673),n=e.i(780612);let a={getCaipTokens(e){if(!e)return;let t={};return Object.entries(e).forEach(([e,r])=>{t[`${n.ConstantsUtil.EIP155}:${e}`]=r}),t},isLowerCaseMatch:(e,t)=>e?.toLowerCase()===t?.toLowerCase(),getActiveNamespaceConnectedToAuth(){let e=r.ChainController.state.activeChain;return t.ConstantsUtil.AUTH_CONNECTOR_SUPPORTED_CHAINS.find(r=>i.ConnectorController.getConnectorId(r)===t.ConstantsUtil.CONNECTOR_ID.AUTH&&r===e)},withRetry({conditionFn:e,intervalMs:t,maxRetries:r}){let i=0;return new Promise(o=>{async function n(){return(i+=1,await e())?o(!0):i>=r?o(!1):(setTimeout(n,t),null)}n()})},userChainIdToChainNamespace(e){if("number"==typeof e)return t.ConstantsUtil.CHAIN.EVM;let[r]=e.split(":");return r},getOtherAuthNamespaces:e=>e?t.ConstantsUtil.AUTH_CONNECTOR_SUPPORTED_CHAINS.filter(t=>t!==e):[],getConnectorStorageInfo(e,t){let r=o.StorageUtil.getConnections()[t]??[];return{hasDisconnected:o.StorageUtil.isConnectorDisconnected(e,t),hasConnected:r.some(t=>a.isLowerCaseMatch(t.connectorId,e))}}};e.s(["HelpersUtil",0,a])},379176,e=>{"use strict";var t={exports:{}};function r(e){try{return JSON.stringify(e)}catch{return'"[Circular]"'}}let i=function(e,t,i){var o=i&&i.stringify||r;if("object"==typeof e&&null!==e){var n=t.length+1;if(1===n)return e;var a=Array(n);a[0]=o(e);for(var s=1;s<n;s++)a[s]=o(t[s]);return a.join(" ")}if("string"!=typeof e)return e;var l=t.length;if(0===l)return e;for(var c="",u=0,d=-1,p=e&&e.length||0,h=0;h<p;){if(37===e.charCodeAt(h)&&h+1<p){switch(d=d>-1?d:0,e.charCodeAt(h+1)){case 100:case 102:if(u>=l||null==t[u])break;d<h&&(c+=e.slice(d,h)),c+=Number(t[u]),d=h+2,h++;break;case 105:if(u>=l||null==t[u])break;d<h&&(c+=e.slice(d,h)),c+=Math.floor(Number(t[u])),d=h+2,h++;break;case 79:case 111:case 106:if(u>=l||void 0===t[u])break;d<h&&(c+=e.slice(d,h));var m=typeof t[u];if("string"===m){c+="'"+t[u]+"'",d=h+2,h++;break}if("function"===m){c+=t[u].name||"<anonymous>",d=h+2,h++;break}c+=o(t[u]),d=h+2,h++;break;case 115:if(u>=l)break;d<h&&(c+=e.slice(d,h)),c+=String(t[u]),d=h+2,h++;break;case 37:d<h&&(c+=e.slice(d,h)),c+="%",d=h+2,h++,u--}++u}++h}return -1===d?e:(d<p&&(c+=e.slice(d)),c)};t.exports=u;let o=function(){function e(e){return"u">typeof e&&e}try{return"u">typeof globalThis||Object.defineProperty(Object.prototype,"globalThis",{get:function(){return delete Object.prototype.globalThis,this.globalThis=this},configurable:!0}),globalThis}catch{return e(self)||e(window)||e(this)||{}}}().console||{};function n(e,t){return"silent"===e?1/0:t.levels.values[e]}let a=Symbol("pino.logFuncs"),s=Symbol("pino.hierarchy"),l={error:"log",fatal:"error",warn:"error",info:"log",debug:"log",trace:"log"};function c(e,t){let r={logger:t,parent:e[s]};t[s]=r}function u(e){var t,r,i;let s,m,g;(e=e||{}).browser=e.browser||{};let f=e.browser.transmit;if(f&&"function"!=typeof f.send)throw Error("pino: transmit option must have a send function");let v=e.browser.write||o;e.browser.write&&(e.browser.asObject=!0);let x=e.serializers||{},E=(t=e.browser.serialize,Array.isArray(t)?t.filter(function(e){return"!stdSerializers.err"!==e}):!0===t&&Object.keys(x)),$=e.browser.serialize;Array.isArray(e.browser.serialize)&&e.browser.serialize.indexOf("!stdSerializers.err")>-1&&($=!1);let C=Object.keys(e.customLevels||{}),T=["error","fatal","warn","info","debug","trace"].concat(C);"function"==typeof v&&T.forEach(function(e){v[e]=v}),(!1===e.enabled||e.browser.disabled)&&(e.level="silent");let S=e.level||"info",k=Object.create(v);k.log||(k.log=y),s={},T.forEach(e=>{s[e]=v[e]?v[e]:o[e]||o[l[e]||"log"]||y}),k[a]=s,c({},k),Object.defineProperty(k,"levelVal",{get:function(){return n(this.level,this)}}),Object.defineProperty(k,"level",{get:function(){return this._level},set:function(e){if("silent"!==e&&!this.levels.values[e])throw Error("unknown level "+e);this._level=e,d(this,O,k,"error"),d(this,O,k,"fatal"),d(this,O,k,"warn"),d(this,O,k,"info"),d(this,O,k,"debug"),d(this,O,k,"trace"),C.forEach(e=>{d(this,O,k,e)})}});let O={transmit:f,serialize:E,asObject:e.browser.asObject,asObjectBindingsOnly:e.browser.asObjectBindingsOnly,formatters:e.browser.formatters,levels:T,timestamp:"function"==typeof(r=e).timestamp?r.timestamp:!1===r.timestamp?b:w,messageKey:e.messageKey||"msg",onChild:e.onChild||y};function R(t,r,i){if(!r)throw Error("missing bindings for child Pino");i=i||{},E&&r.serializers&&(i.serializers=r.serializers);let o=i.serializers;if(E&&o){var n=Object.assign({},x,o),a=!0===e.browser.serialize?Object.keys(n):E;delete r.serializers,p([r],a,n,this._stdErrSerialize)}function s(e){this._childLevel=(0|e._childLevel)+1,this.bindings=r,n&&(this.serializers=n,this._serialize=a),f&&(this._logEvent=h([].concat(e._logEvent.bindings,r)))}s.prototype=this;let l=new s(this);return c(this,l),l.child=function(...e){return R.call(this,t,...e)},l.level=i.level||this.level,t.onChild(l),l}return m=e.customLevels||{},k.levels={values:Object.assign({},u.levels.values,m),labels:Object.assign({},u.levels.labels,(g={},Object.keys(i=m).forEach(function(e){g[i[e]]=e}),g))},k.level=S,k.isLevelEnabled=function(e){return!!this.levels.values[e]&&this.levels.values[e]>=this.levels.values[this.level]},k.setMaxListeners=k.getMaxListeners=k.emit=k.addListener=k.on=k.prependListener=k.once=k.prependOnceListener=k.removeListener=k.removeAllListeners=k.listeners=k.listenerCount=k.eventNames=k.write=k.flush=y,k.serializers=x,k._serialize=E,k._stdErrSerialize=$,k.child=function(...e){return R.call(this,O,...e)},f&&(k._logEvent=h()),k}function d(e,t,r,l){var c,u,d,m,g,f,b;if(Object.defineProperty(e,l,{value:n(e.level,r)>n(l,r)?y:r[a][l],writable:!0,enumerable:!0,configurable:!0}),e[l]===y){if(!t.transmit)return;let i=n(t.transmit.level||e.level,r);if(n(l,r)<i)return}e[l]=(c=e,u=t,d=r,m=l,g=c[a][m],function(){let e=u.timestamp(),t=Array(arguments.length),r=Object.getPrototypeOf&&Object.getPrototypeOf(this)===o?o:this;for(var a=0;a<t.length;a++)t[a]=arguments[a];var s=!1;if(u.serialize&&(p(t,this._serialize,this.serializers,this._stdErrSerialize),s=!0),u.asObject||u.formatters?g.call(r,...function(e,t,r,o,n){let{level:a,log:s=e=>e}=n.formatters||{},l=r.slice(),c=l[0],u={},d=(0|e._childLevel)+1;if((d<1&&(d=1),o&&(u.time=o),a)?Object.assign(u,a(t,e.levels.values[t])):u.level=e.levels.values[t],n.asObjectBindingsOnly){if(null!==c&&"object"==typeof c)for(;d--&&"object"==typeof l[0];)Object.assign(u,l.shift());return[s(u),...l]}if(null!==c&&"object"==typeof c){for(;d--&&"object"==typeof l[0];)Object.assign(u,l.shift());c=l.length?i(l.shift(),l):void 0}else"string"==typeof c&&(c=i(l.shift(),l));return void 0!==c&&(u[n.messageKey]=c),[s(u)]}(this,m,t,e,u)):g.apply(r,t),u.transmit){let r=u.transmit.level||c._level,i=n(r,d),o=n(m,d);if(o<i)return;!function(e,t,r,i=!1){let o=t.send,n=t.ts,a=t.methodLevel,s=t.methodValue,l=t.val,c=e._logEvent.bindings;i||p(r,e._serialize||Object.keys(e.serializers),e.serializers,void 0===e._stdErrSerialize||e._stdErrSerialize),e._logEvent.ts=n,e._logEvent.messages=r.filter(function(e){return -1===c.indexOf(e)}),e._logEvent.level.label=a,e._logEvent.level.value=s,o(a,e._logEvent,l),e._logEvent=h(c)}(this,{ts:e,methodLevel:m,methodValue:o,transmitLevel:r,transmitValue:d.levels.values[u.transmit.level||c._level],send:u.transmit.send,val:n(c._level,d)},t,s)}});let w=function(e){let t=[];e.bindings&&t.push(e.bindings);let r=e[s];for(;r.parent;)(r=r.parent).logger.bindings&&t.push(r.logger.bindings);return t.reverse()}(e);0!==w.length&&(e[l]=(f=w,b=e[l],function(){return b.apply(this,[...f,...arguments])}))}function p(e,t,r,i){for(let o in e)if(i&&e[o]instanceof Error)e[o]=u.stdSerializers.err(e[o]);else if("object"==typeof e[o]&&!Array.isArray(e[o])&&t)for(let i in e[o])t.indexOf(i)>-1&&i in r&&(e[o][i]=r[i](e[o][i]))}function h(e){return{ts:0,messages:[],bindings:e||[],level:{label:"",value:0}}}function m(e){let t={type:e.constructor.name,msg:e.message,stack:e.stack};for(let r in e)void 0===t[r]&&(t[r]=e[r]);return t}function g(){return{}}function f(e){return e}function y(){}function b(){return!1}function w(){return Date.now()}u.levels={values:{fatal:60,error:50,warn:40,info:30,debug:20,trace:10},labels:{10:"trace",20:"debug",30:"info",40:"warn",50:"error",60:"fatal"}},u.stdSerializers={mapHttpRequest:g,mapHttpResponse:g,wrapRequestSerializer:f,wrapResponseSerializer:f,wrapErrorSerializer:f,req:g,res:g,err:m,errWithCause:m},u.stdTimeFunctions=Object.assign({},{nullTime:b,epochTime:w,unixTime:function(){return Math.round(Date.now()/1e3)},isoTime:function(){return new Date(Date.now()).toISOString()}}),t.exports.default=u,t.exports.pino=u;let v="custom_context";var x=Object.defineProperty,E=(e,t,r)=>{let i;return(i="symbol"!=typeof t?t+"":t)in e?x(e,i,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[i]=r};class ${constructor(e){E(this,"nodeValue"),E(this,"sizeInBytes"),E(this,"next"),this.nodeValue=e,this.sizeInBytes=new TextEncoder().encode(this.nodeValue).length,this.next=null}get value(){return this.nodeValue}get size(){return this.sizeInBytes}}class C{constructor(e){E(this,"lengthInNodes"),E(this,"sizeInBytes"),E(this,"head"),E(this,"tail"),E(this,"maxSizeInBytes"),this.head=null,this.tail=null,this.lengthInNodes=0,this.maxSizeInBytes=e,this.sizeInBytes=0}append(e){let t=new $(e);if(t.size>this.maxSizeInBytes)throw Error(`[LinkedList] Value too big to insert into list: ${e} with size ${t.size}`);for(;this.size+t.size>this.maxSizeInBytes;)this.shift();this.head?this.tail&&(this.tail.next=t):this.head=t,this.tail=t,this.lengthInNodes++,this.sizeInBytes+=t.size}shift(){if(!this.head)return;let e=this.head;this.head=this.head.next,this.head||(this.tail=null),this.lengthInNodes--,this.sizeInBytes-=e.size}toArray(){let e=[],t=this.head;for(;null!==t;)e.push(t.value),t=t.next;return e}get length(){return this.lengthInNodes}get size(){return this.sizeInBytes}toOrderedArray(){return Array.from(this)}[Symbol.iterator](){let e=this.head;return{next:()=>{if(!e)return{done:!0,value:null};let t=e.value;return e=e.next,{done:!1,value:t}}}}}function T(e){return"string"==typeof e?e:JSON.stringify(e,(e,t)=>"bigint"==typeof t?t.toString()+"n":t)||""}var S=Object.defineProperty,k=(e,t,r)=>{let i;return(i="symbol"!=typeof t?t+"":t)in e?S(e,i,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[i]=r};class O{constructor(e,r=1024e3){k(this,"logs"),k(this,"level"),k(this,"levelValue"),k(this,"MAX_LOG_SIZE_IN_BYTES"),this.level=e??"error",this.levelValue=t.exports.levels.values[this.level],this.MAX_LOG_SIZE_IN_BYTES=r,this.logs=new C(this.MAX_LOG_SIZE_IN_BYTES)}forwardToConsole(e,r){r===t.exports.levels.values.error?console.error(e):r===t.exports.levels.values.warn?console.warn(e):r===t.exports.levels.values.debug?console.debug(e):r===t.exports.levels.values.trace?console.trace(e):console.log(e)}appendToLogs(e){this.logs.append(T({timestamp:new Date().toISOString(),log:e}));let t="string"==typeof e?JSON.parse(e).level:e.level;t>=this.levelValue&&this.forwardToConsole(e,t)}getLogs(){return this.logs}clearLogs(){this.logs=new C(this.MAX_LOG_SIZE_IN_BYTES)}getLogArray(){return Array.from(this.logs)}logsToBlob(e){let t=this.getLogArray();return t.push(T({extraMetadata:e})),new Blob(t,{type:"application/json"})}}var R=Object.defineProperty;class P{constructor(e,t=1024e3){((e,t)=>{let r,i;return i=void 0,(r="symbol"!=typeof t?t+"":t)in e?R(e,r,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[r]=i})(this,"baseChunkLogger"),this.baseChunkLogger=new O(e,t)}write(e){this.baseChunkLogger.appendToLogs(e)}getLogs(){return this.baseChunkLogger.getLogs()}clearLogs(){this.baseChunkLogger.clearLogs()}getLogArray(){return this.baseChunkLogger.getLogArray()}logsToBlob(e){return this.baseChunkLogger.logsToBlob(e)}downloadLogsBlobInBrowser(e){let t=URL.createObjectURL(this.logsToBlob(e)),r=document.createElement("a");r.href=t,r.download=`walletconnect-logs-${new Date().toISOString()}.txt`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(t)}}var A=Object.defineProperty;class I{constructor(e,t=1024e3){((e,t)=>{let r,i;return i=void 0,(r="symbol"!=typeof t?t+"":t)in e?A(e,r,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[r]=i})(this,"baseChunkLogger"),this.baseChunkLogger=new O(e,t)}write(e){this.baseChunkLogger.appendToLogs(e)}getLogs(){return this.baseChunkLogger.getLogs()}clearLogs(){this.baseChunkLogger.clearLogs()}getLogArray(){return this.baseChunkLogger.getLogArray()}logsToBlob(e){return this.baseChunkLogger.logsToBlob(e)}}var N=Object.defineProperty,_=Object.defineProperties,D=Object.getOwnPropertyDescriptors,z=Object.getOwnPropertySymbols,U=Object.prototype.hasOwnProperty,j=Object.prototype.propertyIsEnumerable,M=(e,t,r)=>t in e?N(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,L=(e,t)=>{for(var r in t||(t={}))U.call(t,r)&&M(e,r,t[r]);if(z)for(var r of z(t))j.call(t,r)&&M(e,r,t[r]);return e};function B(e,t=v){return e[t]||""}e.s(["generateChildLogger",0,function(e,t,r=v){let i=function(e,t,r=v){let i=B(e,r);return i.trim()?`${i}/${t}`:t}(e,t,r);return function(e,t,r=v){return e[r]=t,e}(e.child({context:i}),i,r)},"generatePlatformLogger",0,function(e){var r,i,o,n,a,s,l;let c,u,d,p,h,m;if("u">typeof e.loggerOverride&&"string"!=typeof e.loggerOverride)return{logger:e.loggerOverride,chunkLoggerController:null};let g=_(L({},e.opts),D({level:"string"==typeof e.loggerOverride?e.loggerOverride:null==(r=e.opts)?void 0:r.level}));return"u">typeof window?(d=new P(null==(o=(i=_(L({},e),D({opts:g}))).opts)?void 0:o.level,i.maxSizeInBytes),{logger:t.exports((c=L({},i.opts),u={level:"trace",browser:_(L({},null==(n=i.opts)?void 0:n.browser),D({write:e=>d.write(e)}))},_(c,D(u)))),chunkLoggerController:d}):(m=new I(null==(s=(a=_(L({},e),D({opts:g}))).opts)?void 0:s.level,a.maxSizeInBytes),{logger:t.exports((p=L({},a.opts),h={level:"trace",browser:_(L({},null==(l=a.opts)?void 0:l.browser),D({write:e=>m.write(e)}))},_(p,D(h))),m),chunkLoggerController:m})},"getDefaultLoggerOptions",0,function(e){return _(L({},e),D({level:e?.level||"info"}))},"getLoggerContext",0,B])},586295,(e,t,r)=>{e.e,t.exports=function(){"use strict";var e="millisecond",t="second",r="minute",i="hour",o="week",n="month",a="quarter",s="year",l="date",c="Invalid Date",u=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,d=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,p=function(e,t,r){var i=String(e);return!i||i.length>=t?e:""+Array(t+1-i.length).join(r)+e},h="en",m={};m[h]={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(e){var t=["th","st","nd","rd"],r=e%100;return"["+e+(t[(r-20)%10]||t[r]||t[0])+"]"}};var g="$isDayjsObject",f=function(e){return e instanceof v||!(!e||!e[g])},y=function e(t,r,i){var o;if(!t)return h;if("string"==typeof t){var n=t.toLowerCase();m[n]&&(o=n),r&&(m[n]=r,o=n);var a=t.split("-");if(!o&&a.length>1)return e(a[0])}else{var s=t.name;m[s]=t,o=s}return!i&&o&&(h=o),o||!i&&h},b=function(e,t){if(f(e))return e.clone();var r="object"==typeof t?t:{};return r.date=e,r.args=arguments,new v(r)},w={s:p,z:function(e){var t=-e.utcOffset(),r=Math.abs(t);return(t<=0?"+":"-")+p(Math.floor(r/60),2,"0")+":"+p(r%60,2,"0")},m:function e(t,r){if(t.date()<r.date())return-e(r,t);var i=12*(r.year()-t.year())+(r.month()-t.month()),o=t.clone().add(i,n),a=r-o<0,s=t.clone().add(i+(a?-1:1),n);return+(-(i+(r-o)/(a?o-s:s-o))||0)},a:function(e){return e<0?Math.ceil(e)||0:Math.floor(e)},p:function(c){return({M:n,y:s,w:o,d:"day",D:l,h:i,m:r,s:t,ms:e,Q:a})[c]||String(c||"").toLowerCase().replace(/s$/,"")},u:function(e){return void 0===e}};w.l=y,w.i=f,w.w=function(e,t){return b(e,{locale:t.$L,utc:t.$u,x:t.$x,$offset:t.$offset})};var v=function(){function p(e){this.$L=y(e.locale,null,!0),this.parse(e),this.$x=this.$x||e.x||{},this[g]=!0}var h=p.prototype;return h.parse=function(e){this.$d=function(e){var t=e.date,r=e.utc;if(null===t)return new Date(NaN);if(w.u(t))return new Date;if(t instanceof Date)return new Date(t);if("string"==typeof t&&!/Z$/i.test(t)){var i=t.match(u);if(i){var o=i[2]-1||0,n=(i[7]||"0").substring(0,3);return r?new Date(Date.UTC(i[1],o,i[3]||1,i[4]||0,i[5]||0,i[6]||0,n)):new Date(i[1],o,i[3]||1,i[4]||0,i[5]||0,i[6]||0,n)}}return new Date(t)}(e),this.init()},h.init=function(){var e=this.$d;this.$y=e.getFullYear(),this.$M=e.getMonth(),this.$D=e.getDate(),this.$W=e.getDay(),this.$H=e.getHours(),this.$m=e.getMinutes(),this.$s=e.getSeconds(),this.$ms=e.getMilliseconds()},h.$utils=function(){return w},h.isValid=function(){return this.$d.toString()!==c},h.isSame=function(e,t){var r=b(e);return this.startOf(t)<=r&&r<=this.endOf(t)},h.isAfter=function(e,t){return b(e)<this.startOf(t)},h.isBefore=function(e,t){return this.endOf(t)<b(e)},h.$g=function(e,t,r){return w.u(e)?this[t]:this.set(r,e)},h.unix=function(){return Math.floor(this.valueOf()/1e3)},h.valueOf=function(){return this.$d.getTime()},h.startOf=function(e,a){var c=this,u=!!w.u(a)||a,d=w.p(e),p=function(e,t){var r=w.w(c.$u?Date.UTC(c.$y,t,e):new Date(c.$y,t,e),c);return u?r:r.endOf("day")},h=function(e,t){return w.w(c.toDate()[e].apply(c.toDate("s"),(u?[0,0,0,0]:[23,59,59,999]).slice(t)),c)},m=this.$W,g=this.$M,f=this.$D,y="set"+(this.$u?"UTC":"");switch(d){case s:return u?p(1,0):p(31,11);case n:return u?p(1,g):p(0,g+1);case o:var b=this.$locale().weekStart||0,v=(m<b?m+7:m)-b;return p(u?f-v:f+(6-v),g);case"day":case l:return h(y+"Hours",0);case i:return h(y+"Minutes",1);case r:return h(y+"Seconds",2);case t:return h(y+"Milliseconds",3);default:return this.clone()}},h.endOf=function(e){return this.startOf(e,!1)},h.$set=function(o,a){var c,u=w.p(o),d="set"+(this.$u?"UTC":""),p=((c={}).day=d+"Date",c[l]=d+"Date",c[n]=d+"Month",c[s]=d+"FullYear",c[i]=d+"Hours",c[r]=d+"Minutes",c[t]=d+"Seconds",c[e]=d+"Milliseconds",c)[u],h="day"===u?this.$D+(a-this.$W):a;if(u===n||u===s){var m=this.clone().set(l,1);m.$d[p](h),m.init(),this.$d=m.set(l,Math.min(this.$D,m.daysInMonth())).$d}else p&&this.$d[p](h);return this.init(),this},h.set=function(e,t){return this.clone().$set(e,t)},h.get=function(e){return this[w.p(e)]()},h.add=function(e,a){var l,c=this;e=Number(e);var u=w.p(a),d=function(t){var r=b(c);return w.w(r.date(r.date()+Math.round(t*e)),c)};if(u===n)return this.set(n,this.$M+e);if(u===s)return this.set(s,this.$y+e);if("day"===u)return d(1);if(u===o)return d(7);var p=((l={})[r]=6e4,l[i]=36e5,l[t]=1e3,l)[u]||1,h=this.$d.getTime()+e*p;return w.w(h,this)},h.subtract=function(e,t){return this.add(-1*e,t)},h.format=function(e){var t=this,r=this.$locale();if(!this.isValid())return r.invalidDate||c;var i=e||"YYYY-MM-DDTHH:mm:ssZ",o=w.z(this),n=this.$H,a=this.$m,s=this.$M,l=r.weekdays,u=r.months,p=r.meridiem,h=function(e,r,o,n){return e&&(e[r]||e(t,i))||o[r].slice(0,n)},m=function(e){return w.s(n%12||12,e,"0")},g=p||function(e,t,r){var i=e<12?"AM":"PM";return r?i.toLowerCase():i};return i.replace(d,function(e,i){return i||function(e){switch(e){case"YY":return String(t.$y).slice(-2);case"YYYY":return w.s(t.$y,4,"0");case"M":return s+1;case"MM":return w.s(s+1,2,"0");case"MMM":return h(r.monthsShort,s,u,3);case"MMMM":return h(u,s);case"D":return t.$D;case"DD":return w.s(t.$D,2,"0");case"d":return String(t.$W);case"dd":return h(r.weekdaysMin,t.$W,l,2);case"ddd":return h(r.weekdaysShort,t.$W,l,3);case"dddd":return l[t.$W];case"H":return String(n);case"HH":return w.s(n,2,"0");case"h":return m(1);case"hh":return m(2);case"a":return g(n,a,!0);case"A":return g(n,a,!1);case"m":return String(a);case"mm":return w.s(a,2,"0");case"s":return String(t.$s);case"ss":return w.s(t.$s,2,"0");case"SSS":return w.s(t.$ms,3,"0");case"Z":return o}return null}(e)||o.replace(":","")})},h.utcOffset=function(){return-(15*Math.round(this.$d.getTimezoneOffset()/15))},h.diff=function(e,l,c){var u,d=this,p=w.p(l),h=b(e),m=(h.utcOffset()-this.utcOffset())*6e4,g=this-h,f=function(){return w.m(d,h)};switch(p){case s:u=f()/12;break;case n:u=f();break;case a:u=f()/3;break;case o:u=(g-m)/6048e5;break;case"day":u=(g-m)/864e5;break;case i:u=g/36e5;break;case r:u=g/6e4;break;case t:u=g/1e3;break;default:u=g}return c?u:w.a(u)},h.daysInMonth=function(){return this.endOf(n).$D},h.$locale=function(){return m[this.$L]},h.locale=function(e,t){if(!e)return this.$L;var r=this.clone(),i=y(e,t,!0);return i&&(r.$L=i),r},h.clone=function(){return w.w(this.$d,this)},h.toDate=function(){return new Date(this.valueOf())},h.toJSON=function(){return this.isValid()?this.toISOString():null},h.toISOString=function(){return this.$d.toISOString()},h.toString=function(){return this.$d.toUTCString()},p}(),x=v.prototype;return b.prototype=x,[["$ms",e],["$s",t],["$m",r],["$H",i],["$W","day"],["$M",n],["$y",s],["$D",l]].forEach(function(e){x[e[1]]=function(t){return this.$g(t,e[0],e[1])}}),b.extend=function(e,t){return e.$i||(e(t,v,b),e.$i=!0),b},b.locale=y,b.isDayjs=f,b.unix=function(e){return b(1e3*e)},b.en=m[h],b.Ls=m,b.p={},b}()},653462,(e,t,r)=>{e.e,t.exports={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(e){var t=["th","st","nd","rd"],r=e%100;return"["+e+(t[(r-20)%10]||t[r]||t[0])+"]"}}},448036,(e,t,r)=>{e.e,t.exports=function(e,t,r){e=e||{};var i=t.prototype,o={future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"};function n(e,t,r,o){return i.fromToBase(e,t,r,o)}r.en.relativeTime=o,i.fromToBase=function(t,i,n,a,s){for(var l,c,u,d=n.$locale().relativeTime||o,p=e.thresholds||[{l:"s",r:44,d:"second"},{l:"m",r:89},{l:"mm",r:44,d:"minute"},{l:"h",r:89},{l:"hh",r:21,d:"hour"},{l:"d",r:35},{l:"dd",r:25,d:"day"},{l:"M",r:45},{l:"MM",r:10,d:"month"},{l:"y",r:17},{l:"yy",d:"year"}],h=p.length,m=0;m<h;m+=1){var g=p[m];g.d&&(l=a?r(t).diff(n,g.d,!0):n.diff(t,g.d,!0));var f=(e.rounding||Math.round)(Math.abs(l));if(u=l>0,f<=g.r||!g.r){f<=1&&m>0&&(g=p[m-1]);var y=d[g.l];s&&(f=s(""+f)),c="string"==typeof y?y.replace("%d",f):y(f,i,g.l,u);break}}if(i)return c;var b=u?d.future:d.past;return"function"==typeof b?b(c):b.replace("%s",c)},i.to=function(e,t){return n(e,t,this,!0)},i.from=function(e,t){return n(e,t,this)};var a=function(e){return e.$u?r.utc():r()};i.toNow=function(e){return this.to(a(this),e)},i.fromNow=function(e){return this.from(a(this),e)}}},454090,(e,t,r)=>{e.e,t.exports=function(e,t,r){r.updateLocale=function(e,t){var i=r.Ls[e];if(i)return(t?Object.keys(t):[]).forEach(function(e){i[e]=t[e]}),i}}},560589,886492,e=>{"use strict";var t=e.i(518444);let{I:r}=t._$LH;var i=e.i(626964);let o=(e,t)=>{let r=e._$AN;if(void 0===r)return!1;for(let e of r)e._$AO?.(t,!1),o(e,t);return!0},n=e=>{let t,r;do{if(void 0===(t=e._$AM))break;(r=t._$AN).delete(e),e=t}while(0===r?.size)},a=e=>{for(let t;t=e._$AM;e=t){let r=t._$AN;if(void 0===r)t._$AN=r=new Set;else if(r.has(e))break;r.add(e),c(t)}};function s(e){void 0!==this._$AN?(n(this),this._$AM=e,a(this)):this._$AM=e}function l(e,t=!1,r=0){let i=this._$AH,a=this._$AN;if(void 0!==a&&0!==a.size)if(t)if(Array.isArray(i))for(let e=r;e<i.length;e++)o(i[e],!1),n(i[e]);else null!=i&&(o(i,!1),n(i));else o(this,e)}let c=e=>{e.type==i.PartType.CHILD&&(e._$AP??=l,e._$AQ??=s)};class u extends i.Directive{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,t,r){super._$AT(e,t,r),a(this),this.isConnected=e._$AU}_$AO(e,t=!0){e!==this.isConnected&&(this.isConnected=e,e?this.reconnected?.():this.disconnected?.()),t&&(o(this,e),n(this))}setValue(e){if(void 0===this._$Ct.strings)this._$Ct._$AI(e,this);else{let t=[...this._$Ct._$AH];t[this._$Ci]=e,this._$Ct._$AI(t,this,0)}}disconnected(){}reconnected(){}}class d{}let p=new WeakMap,h=(0,i.directive)(class extends u{render(e){return t.nothing}update(e,[r]){let i=r!==this.G;return i&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=r,this.ht=e.options?.host,this.rt(this.ct=e.element)),t.nothing}rt(e){if(void 0!==this.G)if(this.isConnected||(e=void 0),"function"==typeof this.G){let t=this.ht??globalThis,r=p.get(t);void 0===r&&(r=new WeakMap,p.set(t,r)),void 0!==r.get(this.G)&&this.G.call(this.ht,void 0),r.set(this.G,e),void 0!==e&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return"function"==typeof this.G?p.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});e.s(["createRef",0,()=>new d,"ref",0,h],886492),e.s([],560589)},748444,e=>{"use strict";var t=e.i(11298),r=e.i(582167);e.s(["createTransport",0,function({key:e,methods:i,name:o,request:n,retryCount:a=3,retryDelay:s=150,timeout:l,type:c},u){let d=(0,r.uid)();return{config:{key:e,methods:i,name:o,request:n,retryCount:a,retryDelay:s,timeout:l,type:c},request:(0,t.buildRequest)(n,{methods:i,retryCount:a,retryDelay:s,uid:d}),value:u}}])},972162,e=>{"use strict";var t=e.i(542272),r=e.i(716786),i=e.i(114392),o=e.i(886983),n=e.i(748444);let a=0,s=new WeakMap;e.s(["http",0,function(e,l={}){let{batch:c,fetchFn:u,fetchOptions:d,key:p="http",maxResponseBodySize:h,methods:m,name:g="HTTP JSON-RPC",onFetchRequest:f,onFetchResponse:y,retryDelay:b,raw:w}=l;return({chain:v,retryCount:x,timeout:E})=>{let{batchSize:$=1e3,wait:C=0}="object"==typeof c?c:{},T=l.retryCount??x,S=E??l.timeout??1e4,k=e||v?.rpcUrls.default.http[0];if(!k)throw new r.UrlRequiredError;let O=(0,o.getHttpRpcClient)(k,{fetchFn:u,fetchOptions:d,maxResponseBodySize:h,onRequest:f,onResponse:y,timeout:S});return(0,n.createTransport)({key:p,methods:m,name:g,async request({method:e,params:r},o){let n={method:e,params:r},l=o?.signal?{signal:o.signal}:void 0,{schedule:u}=(0,i.createBatchScheduler)({id:`${k}.${function(e){if(!e)return"default";let t=s.get(e);if(void 0!==t)return t;let r=a++;return s.set(e,r),r}(o?.signal)}`,wait:C,shouldSplitBatch:e=>e.length>$,fn:e=>O.request({body:e,fetchOptions:l}),sort:(e,t)=>e.id-t.id}),d=async e=>c?u(e):[await O.request({body:e,fetchOptions:l})],[{error:p,result:h}]=await d(n);if(w)return{error:p,result:h};if(p)throw new t.RpcRequestError({body:n,error:p,url:k});return h},retryCount:T,retryDelay:b,timeout:S,type:"http"},{fetchOptions:d,url:k})}}])},354772,347045,e=>{"use strict";var t=e.i(66635),r=e.i(542272);class i extends t.BaseError{constructor(e,{code:t,docsPath:i,metaMessages:o,name:n,shortMessage:a}){super(a,{cause:e,docsPath:i,metaMessages:o||e?.metaMessages,name:n||"RpcError"}),Object.defineProperty(this,"code",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),this.name=n||e.name,this.code=e instanceof r.RpcRequestError?e.code:t??-1}}class o extends i{constructor(e,t){super(e,t),Object.defineProperty(this,"data",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),this.data=t.data}}class n extends i{constructor(e){super(e,{code:n.code,name:"ParseRpcError",shortMessage:"Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text."})}}Object.defineProperty(n,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32700});class a extends i{constructor(e){super(e,{code:a.code,name:"InvalidRequestRpcError",shortMessage:"JSON is not a valid request object."})}}Object.defineProperty(a,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32600});class s extends i{constructor(e,{method:t}={}){super(e,{code:s.code,name:"MethodNotFoundRpcError",shortMessage:`The method${t?` "${t}"`:""} does not exist / is not available.`})}}Object.defineProperty(s,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32601});class l extends i{constructor(e){super(e,{code:l.code,name:"InvalidParamsRpcError",shortMessage:"Invalid parameters were provided to the RPC method.\nDouble check you have provided the correct parameters."})}}Object.defineProperty(l,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32602});class c extends i{constructor(e){super(e,{code:c.code,name:"InternalRpcError",shortMessage:"An internal error was received."})}}Object.defineProperty(c,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32603});class u extends i{constructor(e){super(e,{code:u.code,name:"InvalidInputRpcError",shortMessage:"Missing or invalid parameters.\nDouble check you have provided the correct parameters."})}}Object.defineProperty(u,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32e3});class d extends i{constructor(e){super(e,{code:d.code,name:"ResourceNotFoundRpcError",shortMessage:"Requested resource not found."}),Object.defineProperty(this,"name",{enumerable:!0,configurable:!0,writable:!0,value:"ResourceNotFoundRpcError"})}}Object.defineProperty(d,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32001});class p extends i{constructor(e){super(e,{code:p.code,name:"ResourceUnavailableRpcError",shortMessage:"Requested resource not available."})}}Object.defineProperty(p,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32002});class h extends i{constructor(e){super(e,{code:h.code,name:"TransactionRejectedRpcError",shortMessage:"Transaction creation failed."})}}Object.defineProperty(h,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32003});class m extends i{constructor(e,{method:t}={}){super(e,{code:m.code,name:"MethodNotSupportedRpcError",shortMessage:`Method${t?` "${t}"`:""} is not supported.`})}}Object.defineProperty(m,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32004});class g extends i{constructor(e){super(e,{code:g.code,name:"LimitExceededRpcError",shortMessage:"Request exceeds defined limit."})}}Object.defineProperty(g,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32005});class f extends i{constructor(e){super(e,{code:f.code,name:"JsonRpcVersionUnsupportedError",shortMessage:"Version of JSON-RPC protocol is not supported."})}}Object.defineProperty(f,"code",{enumerable:!0,configurable:!0,writable:!0,value:-32006});class y extends o{constructor(e){super(e,{code:y.code,name:"UserRejectedRequestError",shortMessage:"User rejected the request."})}}Object.defineProperty(y,"code",{enumerable:!0,configurable:!0,writable:!0,value:4001});class b extends o{constructor(e){super(e,{code:b.code,name:"UnauthorizedProviderError",shortMessage:"The requested method and/or account has not been authorized by the user."})}}Object.defineProperty(b,"code",{enumerable:!0,configurable:!0,writable:!0,value:4100});class w extends o{constructor(e,{method:t}={}){super(e,{code:w.code,name:"UnsupportedProviderMethodError",shortMessage:`The Provider does not support the requested method${t?` " ${t}"`:""}.`})}}Object.defineProperty(w,"code",{enumerable:!0,configurable:!0,writable:!0,value:4200});class v extends o{constructor(e){super(e,{code:v.code,name:"ProviderDisconnectedError",shortMessage:"The Provider is disconnected from all chains."})}}Object.defineProperty(v,"code",{enumerable:!0,configurable:!0,writable:!0,value:4900});class x extends o{constructor(e){super(e,{code:x.code,name:"ChainDisconnectedError",shortMessage:"The Provider is not connected to the requested chain."})}}Object.defineProperty(x,"code",{enumerable:!0,configurable:!0,writable:!0,value:4901});class E extends o{constructor(e){super(e,{code:E.code,name:"SwitchChainError",shortMessage:"An error occurred when attempting to switch chain."})}}Object.defineProperty(E,"code",{enumerable:!0,configurable:!0,writable:!0,value:4902});class $ extends o{constructor(e){super(e,{code:$.code,name:"UnsupportedNonOptionalCapabilityError",shortMessage:"This Wallet does not support a capability that was not marked as optional."})}}Object.defineProperty($,"code",{enumerable:!0,configurable:!0,writable:!0,value:5700});class C extends o{constructor(e){super(e,{code:C.code,name:"UnsupportedChainIdError",shortMessage:"This Wallet does not support the requested chain ID."})}}Object.defineProperty(C,"code",{enumerable:!0,configurable:!0,writable:!0,value:5710});class T extends o{constructor(e){super(e,{code:T.code,name:"DuplicateIdError",shortMessage:"There is already a bundle submitted with this ID."})}}Object.defineProperty(T,"code",{enumerable:!0,configurable:!0,writable:!0,value:5720});class S extends o{constructor(e){super(e,{code:S.code,name:"UnknownBundleIdError",shortMessage:"This bundle id is unknown / has not been submitted"})}}Object.defineProperty(S,"code",{enumerable:!0,configurable:!0,writable:!0,value:5730});class k extends o{constructor(e){super(e,{code:k.code,name:"BundleTooLargeError",shortMessage:"The call bundle is too large for the Wallet to process."})}}Object.defineProperty(k,"code",{enumerable:!0,configurable:!0,writable:!0,value:5740});class O extends o{constructor(e){super(e,{code:O.code,name:"AtomicReadyWalletRejectedUpgradeError",shortMessage:"The Wallet can support atomicity after an upgrade, but the user rejected the upgrade."})}}Object.defineProperty(O,"code",{enumerable:!0,configurable:!0,writable:!0,value:5750});class R extends o{constructor(e){super(e,{code:R.code,name:"AtomicityNotSupportedError",shortMessage:"The wallet does not support atomic execution but the request requires it."})}}Object.defineProperty(R,"code",{enumerable:!0,configurable:!0,writable:!0,value:5760});class P extends o{constructor(e){super(e,{code:P.code,name:"WalletConnectSessionSettlementError",shortMessage:"WalletConnect session settlement failed."})}}Object.defineProperty(P,"code",{enumerable:!0,configurable:!0,writable:!0,value:7e3}),e.s(["AtomicReadyWalletRejectedUpgradeError",0,O,"AtomicityNotSupportedError",0,R,"BundleTooLargeError",0,k,"ChainDisconnectedError",0,x,"DuplicateIdError",0,T,"InternalRpcError",0,c,"InvalidInputRpcError",0,u,"InvalidParamsRpcError",0,l,"InvalidRequestRpcError",0,a,"JsonRpcVersionUnsupportedError",0,f,"LimitExceededRpcError",0,g,"MethodNotFoundRpcError",0,s,"MethodNotSupportedRpcError",0,m,"ParseRpcError",0,n,"ProviderDisconnectedError",0,v,"ResourceNotFoundRpcError",0,d,"ResourceUnavailableRpcError",0,p,"SwitchChainError",0,E,"TransactionRejectedRpcError",0,h,"UnauthorizedProviderError",0,b,"UnknownBundleIdError",0,S,"UnknownRpcError",0,class extends i{constructor(e){super(e,{name:"UnknownRpcError",shortMessage:"An unknown RPC error occurred."})}},"UnsupportedChainIdError",0,C,"UnsupportedNonOptionalCapabilityError",0,$,"UnsupportedProviderMethodError",0,w,"UserRejectedRequestError",0,y,"WalletConnectSessionSettlementError",0,P],354772);var A=e.i(141497);async function I(e,{signal:t}={}){return new Promise((r,i)=>{if(t?.aborted)return void i((0,A.getAbortError)(t));let o=()=>t?.removeEventListener("abort",a),n=setTimeout(()=>{o(),r()},e),a=()=>{clearTimeout(n),o(),i((0,A.getAbortError)(t))};t?.addEventListener("abort",a,{once:!0})})}e.s(["wait",0,I],347045)},716786,886983,e=>{"use strict";var t=e.i(66635);class r extends t.BaseError{constructor(){super("No URL was provided to the Transport. Please provide a valid RPC URL to the Transport.",{docsPath:"/docs/clients/intro",name:"UrlRequiredError"})}}e.s(["UrlRequiredError",0,r],716786);var i=e.i(542272),o=e.i(141497),n=e.i(607697);let a={current:0,take(){return this.current++},reset(){this.current=0}};async function s(e,{maxResponseBodySize:t}){if(!1===t)return e.text();let r=e.headers.get("Content-Length");if(r){let e=Number(r);if(e>t)throw new i.ResponseBodyTooLargeError({maxSize:t,size:e})}if(!e.body){let r=await e.text(),o=new TextEncoder().encode(r).length;if(o>t)throw new i.ResponseBodyTooLargeError({maxSize:t,size:o});return r}let o=e.body.getReader(),n=new TextDecoder,a="",l=0;try{for(;;){let{done:e,value:r}=await o.read();if(e)break;if((l+=r.byteLength)>t)throw await o.cancel(),new i.ResponseBodyTooLargeError({maxSize:t,size:l});a+=n.decode(r,{stream:!0})}return a+=n.decode()}finally{o.releaseLock()}}e.s(["getHttpRpcClient",0,function(e,t={}){let{url:r,headers:l}=function(e){try{let t=new URL(e),r=(()=>{if(t.username){let e=`${decodeURIComponent(t.username)}:${decodeURIComponent(t.password)}`;return t.username="",t.password="",{url:t.toString(),headers:{Authorization:`Basic ${btoa(e)}`}}}})();return{url:t.toString(),...r}}catch{return{url:e}}}(e);return{async request(e){let{body:c,fetchFn:u=t.fetchFn??fetch,maxResponseBodySize:d=t.maxResponseBodySize??0xa00000,onRequest:p=t.onRequest,onResponse:h=t.onResponse,timeout:m=t.timeout??1e4}=e,g={...t.fetchOptions??{},...e.fetchOptions??{}},{headers:f,method:y,signal:b}=g;try{let e,t=await function(e,{errorInstance:t=Error("timed out"),timeout:r,signal:i}){return new Promise((n,a)=>{(async()=>{let s,l=new AbortController;try{r>0&&(s=setTimeout(()=>{i?l.abort():a(t)},r)),n(await e({signal:l?.signal||null}))}catch(e){if(l?.signal.aborted&&(0,o.isAbortError)(e))return void a(t);a(e)}finally{clearTimeout(s)}})()})}(async({signal:e})=>{let t={...g,body:Array.isArray(c)?(0,n.stringify)(c.map(e=>({jsonrpc:"2.0",id:e.id??a.take(),...e}))):(0,n.stringify)({jsonrpc:"2.0",id:c.id??a.take(),...c}),headers:{...l,"Content-Type":"application/json",...f},method:y||"POST",signal:b||(m>0?e:null)},i=new Request(r,t),o=await p?.(i,t)??{...t,url:r};return await u(o.url??r,o)},{errorInstance:new i.TimeoutError({body:c,url:r}),timeout:m,signal:!0});h&&await h(t);let w=await s(t,{maxResponseBodySize:d});if(t.headers.get("Content-Type")?.startsWith("application/json"))e=JSON.parse(w);else{e=w;try{e=JSON.parse(e||"{}")}catch(r){if(t.ok)throw r;e={error:e}}}if(!t.ok){if("number"==typeof e.error?.code&&"string"==typeof e.error?.message)return e;throw new i.HttpRequestError({body:c,details:(0,n.stringify)(e.error)||t.statusText,headers:t.headers,status:t.status,url:r})}return e}catch(e){if(b?.aborted)throw(0,o.getAbortError)(b);if((0,o.isAbortError)(e)||e instanceof i.HttpRequestError||e instanceof i.ResponseBodyTooLargeError||e instanceof i.TimeoutError)throw e;throw new i.HttpRequestError({body:c,cause:e,url:r})}}}}],886983)},11298,e=>{"use strict";var t=e.i(66635),r=e.i(542272),i=e.i(354772),o=e.i(141497),n=e.i(895315),a=e.i(905631),s=e.i(607697);e.s(["buildRequest",0,function(e,l={}){return async(c,u={})=>{let{dedupe:d=!1,methods:p,retryDelay:h=150,retryCount:m=3,signal:g,uid:f}={...l,...u},{method:y}=c;if(p?.exclude?.includes(y)||p?.include&&!p.include.includes(y))throw new i.MethodNotSupportedRpcError(Error("method not supported"),{method:y});if(g?.aborted)throw(0,o.getAbortError)(g);let b=d?function(e,t=0){let r=0xdeadbeef^t,i=0x41c6ce57^t;for(let t=0;t<e.length;t++){let o=e.charCodeAt(t);r=Math.imul(r^o,0x9e3779b1),i=Math.imul(i^o,0x5f356495)}return r=Math.imul(r^r>>>16,0x85ebca6b)^Math.imul(i^i>>>16,0xc2b2ae35),(0x100000000*(2097151&(i=Math.imul(i^i>>>16,0x85ebca6b)^Math.imul(r^r>>>16,0xc2b2ae35)))+(r>>>0)).toString(36)}(`${f}.${(0,s.stringify)(c)}`):void 0;return(0,n.withDedupe)(()=>(0,a.withRetry)(async()=>{try{return await e(c,g?{signal:g}:void 0)}catch(e){if(g?.aborted)throw(0,o.getAbortError)(g);if((0,o.isAbortError)(e))throw e;switch(e.code){case i.ParseRpcError.code:throw new i.ParseRpcError(e);case i.InvalidRequestRpcError.code:throw new i.InvalidRequestRpcError(e);case i.MethodNotFoundRpcError.code:throw new i.MethodNotFoundRpcError(e,{method:c.method});case i.InvalidParamsRpcError.code:throw new i.InvalidParamsRpcError(e);case i.InternalRpcError.code:throw new i.InternalRpcError(e);case i.InvalidInputRpcError.code:throw new i.InvalidInputRpcError(e);case i.ResourceNotFoundRpcError.code:throw new i.ResourceNotFoundRpcError(e);case i.ResourceUnavailableRpcError.code:throw new i.ResourceUnavailableRpcError(e);case i.TransactionRejectedRpcError.code:throw new i.TransactionRejectedRpcError(e);case i.MethodNotSupportedRpcError.code:throw new i.MethodNotSupportedRpcError(e,{method:c.method});case i.LimitExceededRpcError.code:throw new i.LimitExceededRpcError(e);case i.JsonRpcVersionUnsupportedError.code:throw new i.JsonRpcVersionUnsupportedError(e);case i.UserRejectedRequestError.code:throw new i.UserRejectedRequestError(e);case i.UnauthorizedProviderError.code:throw new i.UnauthorizedProviderError(e);case i.UnsupportedProviderMethodError.code:throw new i.UnsupportedProviderMethodError(e);case i.ProviderDisconnectedError.code:throw new i.ProviderDisconnectedError(e);case i.ChainDisconnectedError.code:throw new i.ChainDisconnectedError(e);case i.SwitchChainError.code:throw new i.SwitchChainError(e);case i.UnsupportedNonOptionalCapabilityError.code:throw new i.UnsupportedNonOptionalCapabilityError(e);case i.UnsupportedChainIdError.code:throw new i.UnsupportedChainIdError(e);case i.DuplicateIdError.code:throw new i.DuplicateIdError(e);case i.UnknownBundleIdError.code:throw new i.UnknownBundleIdError(e);case i.BundleTooLargeError.code:throw new i.BundleTooLargeError(e);case i.AtomicReadyWalletRejectedUpgradeError.code:throw new i.AtomicReadyWalletRejectedUpgradeError(e);case i.AtomicityNotSupportedError.code:throw new i.AtomicityNotSupportedError(e);case 5e3:throw new i.UserRejectedRequestError(e);case i.WalletConnectSessionSettlementError.code:throw new i.WalletConnectSessionSettlementError(e);default:if(e instanceof t.BaseError)throw e;throw new i.UnknownRpcError(e)}}},{delay:({count:e,error:t})=>{if(t&&t instanceof r.HttpRequestError){let e=t?.headers?.get("Retry-After");if(e?.match(/\d/))return 1e3*Number.parseInt(e,10)}return~~(1<<e)*h},retryCount:m,signal:g,shouldRetry:({error:e})=>{var t;return t=e,!(0,o.isAbortError)(t)&&("code"in t&&"number"==typeof t.code?-1===t.code||t.code===i.LimitExceededRpcError.code||t.code===i.InternalRpcError.code||429===t.code:!(t instanceof r.HttpRequestError)||!t.status||403===t.status||408===t.status||413===t.status||429===t.status||500===t.status||502===t.status||503===t.status||504===t.status||!1)}}),{enabled:d,id:b})}}])},895315,e=>{"use strict";let t=new(e.i(823995)).LruMap(8192);e.s(["withDedupe",0,function(e,{enabled:r=!0,id:i}){if(!r||!i)return e();if(t.get(i))return t.get(i);let o=e().finally(()=>t.delete(i));return t.set(i,o),o}])},905631,e=>{"use strict";var t=e.i(141497),r=e.i(347045);e.s(["withRetry",0,function(e,{delay:i=100,retryCount:o=2,shouldRetry:n=()=>!0,signal:a}={}){return new Promise((s,l)=>{let c=async({count:u=0}={})=>{if(a?.aborted)return void l((0,t.getAbortError)(a));let d=async({error:e})=>{let t="function"==typeof i?i({count:u,error:e}):i;if(t)try{await (0,r.wait)(t,{signal:a})}catch(e){l(e);return}return c({count:u+1})};try{let t=await e();s(t)}catch(e){if(a?.aborted)return void l((0,t.getAbortError)(a));if((0,t.isAbortError)(e))return void l(e);if(u<o&&await n({count:u,error:e}))return d({error:e});l(e)}};c().catch(l)})}])},582167,e=>{"use strict";let t,r=256;e.s(["uid",0,function(e=11){if(!t||r+e>512){t="",r=0;for(let e=0;e<256;e++)t+=(256+256*Math.random()|0).toString(16).substring(1)}return t.substring(r,r+++e)}])}]);