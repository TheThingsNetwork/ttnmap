class Map {
  constructor() {
    this.gateways = [];
    this.gatewaysCluster = this.initMarkerClusterGroup();
    this.theThingsNetworkCluster = this.initMarkerClusterGroup();
    this.privateNetworksCluster = this.initMarkerClusterGroup();
    this.showThingsStack = true;
    this.showPrivateNetworks = true;
    this.map = null;
    this.map = this.initMap();
    this.map.scrollWheelZoom.disable();
    this.onlineIcon = this.initIcon();
  }

  initIcon() {
    return L.icon({
      iconUrl: document.currentScript.getAttribute("data-path-icon-gateway"),
      iconSize: [10, 20],
    });
  }

  initMap() {
    if (this.map) {
      return this.map;
    }
    else {
      return L.map("map-wrap", {
        attributionControl: true,
        zoomControl: true,
        worldCopyJump: true,
        preferCanvas: true,
      }).setView(L.latLng(25, 0), 2);
    }
  }

  initMarkerClusterGroup() {
    return L.markerClusterGroup({
      maxClusterRadius: 30,
      chunkedLoading: true,
      iconCreateFunction: function (cluster) {
        return L.divIcon({
          className: "gateways-cluster-icon",
          html: cluster.getChildCount(),
        });
      },
    });
  }

  labelDict(arg) {
    return {
      "map.name": "Gateway name:",
      "map.id": "Gateway ID:",
      "map.unknown": "Unkown"
    }[arg];
  }

  popupContent(gateway) {
    let content = {};
	// Commented out till packet broker api gives the name as well
    // content[this.labelDict("map.name")] = gateway.name;
    content[this.labelDict("map.id")] = gateway.id;
    let result = "";
    for (let key in content) {
      result +=
        "<b>" +
        key +
        "</b> " +
        (content[key] === undefined ? this.labelDict("map.unknown") : content[key]) +
        "<br />";
    }
    return result;
  }

  createMapLayer(gatewaysList, gatewaysClusterList) {
    for (let key in gatewaysList) {
      let gateway = gatewaysList[key];
      if (gateway.hasOwnProperty("location") && gateway.online) {
        let marker = L.marker(
          [gateway.location.latitude, gateway.location.longitude],
          { icon: this.onlineIcon }
        );
        marker.bindPopup(this.popupContent(gateway));
        gatewaysClusterList.addLayer(marker);
      }
    }
    return gatewaysClusterList;
  }

  initMapLayers() {
    let theThingsNetwork = this.gateways.filter(gateway => (gateway.tenantID === "ttn" || gateway.tenantID === "ttnv2"));
    let privateNetworks = this.gateways.filter(gateway => (gateway.tenantID !== "ttn" && gateway.tenantID !== "ttnv2"));

    this.gatewaysCluster = this.createMapLayer(this.gateways, this.gatewaysCluster);
    this.theThingsNetworkCluster = this.createMapLayer(theThingsNetwork, this.theThingsNetworkCluster);
    this.privateNetworksCluster = this.createMapLayer(privateNetworks, this.privateNetworksCluster);

    this.map.addLayer(this.gatewaysCluster);
  }

  createPacketBrokerAnchorTag() {
	let packetBrokerTag = document.createElement('a');

    packetBrokerTag.setAttribute('href', 'https://packetbroker.net/');
    packetBrokerTag.setAttribute('class', 'packet-broker-link leaflet-control');
    packetBrokerTag.setAttribute('target', '_blank');
    packetBrokerTag.innerText = this.gateways.length + " gateways are connected via Packet Broker";
	return packetBrokerTag;
  }

  addPacketBrokerText() {
    let packetBrokerTag = this.createPacketBrokerAnchorTag();
	let packetBrokerTag2 = this.createPacketBrokerAnchorTag();

	packetBrokerTag2.setAttribute('class', 'packet-broker-mobile');

    document.getElementById("packet-broker-id-desktop").appendChild(packetBrokerTag);
    document.getElementById("packet-broker-id-mobile").appendChild(packetBrokerTag2);
  }

  changeMapLayers() {
    this.map.removeLayer(this.gatewaysCluster);
    if (this.showThingsStack && this.showPrivateNetworks) {
      this.map.addLayer(this.gatewaysCluster);
      return;
    }
    (this.showPrivateNetworks)
      ? this.map.addLayer(this.privateNetworksCluster)
      : this.map.removeLayer(this.privateNetworksCluster);
    (this.showThingsStack)
      ? this.map.addLayer(this.theThingsNetworkCluster)
      : this.map.removeLayer(this.theThingsNetworkCluster);
  }

  addReferences() {
    L.tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
      detectRetina: true,
      maxNativeZoom: 17,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    let attributions = document.getElementsByClassName('leaflet-control-attribution')
    for (let index = 0; index < attributions.length; ++index) {
      attributions[index].innerHTML = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
    }
  }

  addSearch() {
    const provider = new window.GeoSearch.OpenStreetMapProvider();
    const search = new GeoSearch.GeoSearchControl({
      provider: provider,
      style: 'bar',
      updateMap: true,
      autoClose: true,
    });
    search.addTo(this.map);
  }
}

(function(){
  let mapClass = new Map();

  mapClass.addReferences();
  mapClass.addSearch();

  fetch("https://mapper.packetbroker.net/api/v2/gateways")
  .then(function (response) {
    return response.json();
  })
  .then(function (gateways) {
    document.getElementById('loading').remove();
    if (gateways === null) {
      return;
    }
    mapClass.gateways = gateways;
    mapClass.addPacketBrokerText();
    mapClass.initMapLayers();
  });

  const thingsStackBtnClick = () => {
    mapClass.showThingsStack = !mapClass.showThingsStack;
    mapClass.changeMapLayers();
  }

  const privateNetBtnClick = () => {
    mapClass.showPrivateNetworks = !mapClass.showPrivateNetworks;
    mapClass.changeMapLayers();
  }

  document.getElementById("ThingsStackBtnDropdown").addEventListener("click", thingsStackBtnClick);
  document.getElementById("PrivateNetBtnDropdown").addEventListener("click", privateNetBtnClick);
  document.getElementById("ThingsStackBtn").addEventListener("click", thingsStackBtnClick);
  document.getElementById("PrivateNetBtn").addEventListener("click", privateNetBtnClick);
})();

document.getElementById("dropdownBtn").addEventListener("click", function() {
  document.getElementById("dropdownId").classList.toggle("show");
  document.getElementById("filter-icon").classList.toggle("hide");
  document.getElementById("close-icon").classList.toggle("hide");
});
