import * as React from "react";
import * as ReactDOM from "react-dom";
import { init } from "./Client";
import { Canvas } from "./components/Canvas";
import * as appEvents from "./AppEvents";
import * as appStore from "./AppStore";

// const urlParams = new URLSearchParams(window.location.search);
// const myParam = urlParams.get('myParam');

const main = async () => {
  await init();
  ReactDOM.render(
    <div>
      <Canvas />
    {/* <FirstComponent/> */}
    </div>,
      document.getElementById("root")
  );
  const localStream = await navigator.mediaDevices.getUserMedia({'video':true,'audio':true});
  console.log('Got MediaStream:', localStream, localStream.getTracks());
  localStream.getTracks().forEach(track => {
    appEvents.emitLocalMediaTrackAdded({
      track,
      userId: appStore.getUserId(),
      clientId: appStore.getClientId(),
    });
  });
};

main();
