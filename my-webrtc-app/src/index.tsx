import * as React from "react";
import * as ReactDOM from "react-dom";
import { init } from "./Client";
import { Canvas } from "./components/Canvas";
import * as appEvents from "./AppEvents";
import * as appStore from "./AppStore";
import { monitor } from "./MyMonitor";

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
  const mediaDevices = await navigator.mediaDevices.enumerateDevices();
  monitor.setMediaDevices(...mediaDevices);
  const constraints = {'video':true,'audio':true};
  monitor.addMediaConstraints(constraints);
  const localStream = await navigator.mediaDevices.getUserMedia(constraints).catch(err => {
    monitor.addUserMediaError(err);
  });
  if (!localStream) return;
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
