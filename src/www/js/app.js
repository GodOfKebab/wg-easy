/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

function bytes(bytes, decimals, kib, maxunit) {
  kib = kib || false;
  if (bytes === 0) return '0 B';
  if (Number.isNaN(parseFloat(bytes)) && !Number.isFinite(bytes)) return 'NaN';
  const k = kib ? 1024 : 1000;
  const dm = decimals != null && !Number.isNaN(decimals) && decimals >= 0 ? decimals : 2;
  const sizes = kib
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB', 'BiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (maxunit !== undefined) {
    const index = sizes.indexOf(maxunit);
    if (index !== -1) i = index;
  }
  // eslint-disable-next-line no-restricted-properties
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

new Vue({
  el: '#app',
  components: {
    apexchart: VueApexCharts,
  },
  data: {
    authenticated: null,
    authenticating: false,
    password: null,
    requiresPassword: null,

    network: { peers: {}, connections: {} },

    peersPersist: {},
    peerDeleteId: null,
    peerCreate: null,
    peerConfigId: null,
    peerConfigWindow: 'edit',
    peerCreateName: '',
    peerCreateEndpoint: '',
    peerEditName: null,
    peerEditNameId: null,
    peerEditAddress: null,
    peerEditAddressId: null,
    peerEditDisableSaveChanges: true,
    peerEditChangedFields: {},
    peerEditOldConfig: { peers: {}, connections: {} },
    peerEditNewConfig: { peers: {}, connections: {} },
    peerQRId: null,

    peerConfigEditData: {
      name: '',
      address: '',
      endpoint: '',
      endpointToggle: false,
      connectionIds: [],
      isConnectionEnabled: [],
      persistentKeepaliveData: [],
      allowedIPsAtoB: [],
      allowedIPsBtoA: [],
    },

    staticPeers: {},
    roamingPeers: {},

    webServerStatus: 'unknown',
    wireguardStatus: 'unknown',
    wireguardToggleTo: null,

    peerCreateShowAdvance: false,
    peerCreateEligibility: false,
    peerCreateEligibilityName: false,
    peerCreateEligibilityEndpoint: false,
    peerCreateEligibilityPeers: false,
    peerCreateEligibilityAllowedIPs: false,
    attachedPeers: [],

    currentRelease: null,
    latestRelease: null,

    chartOptions: {
      chart: {
        background: 'transparent',
        type: 'area',
        toolbar: {
          show: false,
        },
      },
      fill: {
        type: 'gradient',
      },
      colors: ['#CCCCCC'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 0,
      },
      xaxis: {
        labels: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        axisBorder: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          show: false,
        },
        min: 0,
      },
      tooltip: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      grid: {
        show: false,
        padding: {
          left: -10,
          right: 0,
          bottom: -15,
          top: -15,
        },
        column: {
          opacity: 0,
        },
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
    },
  },
  methods: {
    dateTime: value => {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(value);
    },
    async refresh() {
      if (!this.authenticated) return;

      // Get WirGuard Server Status
      await this.api.getWirGuardStatus().then(wgStatus => {
        this.webServerStatus = 'up';
        if (wgStatus['status'] === 'up') {
          this.wireguardStatus = 'up';
        } else if (wgStatus['status'] === 'down') {
          this.wireguardStatus = 'down';
        }
      }).catch(() => {
        this.webServerStatus = 'down';
        this.wireguardStatus = 'unknown';
      });
      if (this.wireguardStatus !== 'up') return;

      // Get the network-wide config
      await this.api.getNetwork().then(network => {
        const staticPeers = {};
        const roamingPeers = {};
        this.network = network;

        // start append to network.connections
        for (const [connectionId, connectionDetails] of Object.entries(network.connections)) {
          // only parse the connections including root
          if (connectionId.includes('root') && connectionDetails.enabled) {
            if (!this.peersPersist[connectionId]) {
              this.peersPersist[connectionId] = {};
              this.peersPersist[connectionId].transferRxHistory = Array(20).fill(0);
              this.peersPersist[connectionId].transferRxPrevious = connectionDetails.transferRx;
              this.peersPersist[connectionId].transferTxHistory = Array(20).fill(0);
              this.peersPersist[connectionId].transferTxPrevious = connectionDetails.transferTx;

              this.peersPersist[connectionId].chartOptions = {
                ...this.chartOptions,
                yaxis: {
                  ...this.chartOptions.yaxis,
                  max: () => this.peersPersist[connectionId].chartMax,
                },
              };
            }

            this.peersPersist[connectionId].transferRxCurrent = connectionDetails.transferRx - this.peersPersist[connectionId].transferRxPrevious;
            this.peersPersist[connectionId].transferRxPrevious = connectionDetails.transferRx;
            this.peersPersist[connectionId].transferTxCurrent = connectionDetails.transferTx - this.peersPersist[connectionId].transferTxPrevious;
            this.peersPersist[connectionId].transferTxPrevious = connectionDetails.transferTx;

            this.peersPersist[connectionId].transferRxHistory.push(this.peersPersist[connectionId].transferRxCurrent);
            this.peersPersist[connectionId].transferRxHistory.shift();

            this.peersPersist[connectionId].transferTxHistory.push(this.peersPersist[connectionId].transferTxCurrent);
            this.peersPersist[connectionId].transferTxHistory.shift();

            this.network.connections[connectionId].transferTxCurrent = this.peersPersist[connectionId].transferTxCurrent;
            this.network.connections[connectionId].transferTxSeries = [{
              name: 'tx',
              data: this.peersPersist[connectionId].transferTxHistory,
            }];

            this.network.connections[connectionId].transferRxCurrent = this.peersPersist[connectionId].transferRxCurrent;
            this.network.connections[connectionId].transferRxSeries = [{
              name: 'rx',
              data: this.peersPersist[connectionId].transferRxHistory,
            }];

            this.peersPersist[connectionId].chartMax = Math.max(...this.peersPersist[connectionId].transferTxHistory, ...this.peersPersist[connectionId].transferRxHistory);

            this.network.connections[connectionId].chartOptions = this.peersPersist[connectionId].chartOptions;
          }
        }
        // end append to network.connections

        // start append to network.peers
        for (const [peerId, peerDetails] of Object.entries(network.peers)) {
          if (peerDetails.name.includes('@') && peerDetails.name.includes('.')) {
            this.network.peers[peerId].avatar = `https://www.gravatar.com/avatar/${md5(peerDetails.name)}?d=blank`;
          }

          if (peerDetails.endpoint.startsWith('static')) {
            staticPeers[peerId] = peerDetails;
          } else if (peerDetails.endpoint.startsWith('roaming')) {
            roamingPeers[peerId] = peerDetails;
          }
        }
        this.staticPeers = staticPeers;
        this.roamingPeers = roamingPeers;
        // end append to network.peers
      }).catch(err => {
        if (err.toString() === 'TypeError: Load failed') {
          this.webServerStatus = 'down';
        } else {
          console.log('getNetwork error =>');
          console.log(err);
        }
      });
    },
    login(e) {
      e.preventDefault();

      if (!this.password) return;
      if (this.authenticating) return;

      this.authenticating = true;
      this.api.createSession({
        password: this.password,
      })
        .then(async () => {
          const session = await this.api.getSession();
          this.authenticated = session.authenticated;
          this.requiresPassword = session.requiresPassword;
          return this.refresh();
        })
        .catch(err => {
          alert(err.message || err.toString());
        })
        .finally(() => {
          this.authenticating = false;
          this.password = null;
        });
    },
    logout(e) {
      e.preventDefault();

      this.api.deleteSession()
        .then(() => {
          this.authenticated = false;
          this.network = null;
        })
        .catch(err => {
          alert(err.message || err.toString());
        });
    },
    createPeer(newPeerType) {
      const name = this.peerCreateName;
      if (!name) return;
      const endpoint = this.peerCreateEndpoint;
      if (!endpoint && newPeerType === 'static') return;

      const attachedPeersCompact = [];

      for (const peerId of this.attachedPeers) {
        attachedPeersCompact.push({
          peer: peerId,
          allowedIPs: document.getElementById(`${peerId}_ip_subnet`).value,
        });
      }
      this.api.createPeer({ name, endpoint, attachedPeers: attachedPeersCompact })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    deletePeer(peerId) {
      this.api.deletePeer({ peerId })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    enablePeer(peerId) {
      this.api.enablePeer({ peerId })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    disablePeer(peerId) {
      this.api.disablePeer({ peerId })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerName(peerId, name) {
      this.api.updatePeerName({ peerId, name })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerAddress(peerId, address) {
      this.api.updatePeerAddress({ peerId, address })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    getPeerConf(peerId) {
      return this.wg.getPeerConfig(this.network, peerId);
    },
    downloadPeerConf(peerId) {
      this.wg.downloadPeerConfig(this.network, peerId);
    },
    toggleWireGuardNetworking() {
      if (this.wireguardStatus === 'up' && this.wireguardToggleTo === 'disable') {
        this.wireguardStatus = 'unknown';
        this.api.wireguardDisable()
          .catch(err => alert(err.message || err.toString()))
          .finally(() => this.refresh().catch(console.error));
      } else if (this.wireguardStatus === 'down' && this.wireguardToggleTo === 'enable') {
        this.wireguardStatus = 'unknown';
        this.api.wireguardEnable()
          .catch(err => alert(err.message || err.toString()))
          .finally(() => this.refresh().catch(console.error));
      }
      this.wireguardToggleTo = null;
    },
    handleAttachPeers(mode) {
      const checkboxArray = [];
      const peersArray = [];
      for (const [peerId, peerDetails] of Object.entries(this.network.peers)) {
        if (peerDetails.endpoint.startsWith('static')) {
          checkboxArray.push(document.getElementById(`${peerId}_checkbox`));
          peersArray.push(peerId);
        }
      }

      // run when show advance is clicked
      if (mode === 'init') {
        this.peerCreateName = '';
        this.peerCreateEndpoint = '';
        this.peerCreateShowAdvance = false;

        for (const peerId of peersArray) {
          if (this.network.peers[peerId].endpoint.startsWith('static')) {
            document.getElementById(`${peerId}_checkbox`).checked = false;
            document.getElementById(`${peerId}_ip_subnet`).value = `${this.network.peers[peerId].address}/32`;
          }
        }

        // enable the root server as default
        this.attachedPeers = ['root'];
        document.getElementById('root_checkbox').checked = true;
        document.getElementById('selectall_checkbox').checked = checkboxArray.length === 1;
        document.getElementById('root_ip_subnet').value = this.peerCreate === 'static' ? '10.8.0.1/24' : '0.0.0.0/0';

        this.checkPeerCreateEligibility('all');
        return;
      }

      // run when select all is clicked
      let allChecked = true;
      if (mode === 'all') {
        for (let i = 0; i < checkboxArray.length; i++) {
          allChecked &= checkboxArray.at(i).checked;
        }
        for (let i = 0; i < checkboxArray.length; i++) {
          checkboxArray.at(i).checked = !allChecked;
        }
      }

      // run when individual peer boxes are clicked
      if (mode === 'individual') {
        for (let i = 0; i < checkboxArray.length; i++) {
          allChecked &= checkboxArray.at(i).checked;
        }
        document.getElementById('selectall_checkbox').checked = allChecked;
      }

      const attachedPeersArray = [];
      for (let i = 0; i < checkboxArray.length; i++) {
        if (checkboxArray.at(i).checked) {
          attachedPeersArray.push(peersArray.at(i));
        }
      }
      this.attachedPeers = attachedPeersArray;

      // check peer create eligibility
      this.checkPeerCreateEligibility('peer');
    },
    checkPeerCreateEligibility(mode) {
      const tailwindLightGreen = 'rgb(240 253 244)';
      const tailwindDarkerGreen = 'rgb(187 247 208)';
      const tailwindLightRed = 'rgb(254 242 242)';
      const tailwindDarkerRed = 'rgb(254 202 202)';

      // check name
      if (mode === 'name') {
        this.peerCreateEligibilityName = this.peerCreateName.length > 0;
        document.getElementById('peerCreateName').style.backgroundColor = this.peerCreateEligibilityName ? tailwindLightGreen : tailwindLightRed;
      }

      // check endpoint
      if (mode === 'endpoint') {
        this.peerCreateEligibilityEndpoint = this.peerCreateEndpoint.match('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
        this.peerCreateEligibilityEndpoint ||= this.peerCreateEndpoint.match('^(((?!\\-))(xn\\-\\-)?[a-z0-9\\-_]{0,61}[a-z0-9]{1,1}\\.)*(xn\\-\\-)?([a-z0-9\\-]{1,61}|[a-z0-9\\-]{1,30})\\.[a-z]{2,}:(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
        document.getElementById('peerCreateEndpoint').style.backgroundColor = this.peerCreateEligibilityEndpoint ? tailwindLightGreen : tailwindLightRed;
      }

      // check peer count
      if (mode === 'peerCount') {
        this.peerCreateEligibilityPeers = this.attachedPeers.length > 0;
        document.getElementById('attachPeersDiv').style.backgroundColor = this.peerCreateEligibilityPeers ? tailwindLightGreen : tailwindLightRed;
        this.checkPeerCreateEligibility('allowedIPs');
      }

      // check allowedIPs
      if (mode === 'allowedIPs') {
        this.peerCreateEligibilityAllowedIPs = this.attachedPeers.length > 0;
        for (const peerId of this.attachedPeers) {
          const allowedIPsEligibility = document.getElementById(`${peerId}_ip_subnet`).value.match('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9]))(,((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9])))*$');
          this.peerCreateEligibilityAllowedIPs &&= allowedIPsEligibility;
          document.getElementById(`${peerId}_ip_subnet`).style.backgroundColor = allowedIPsEligibility ? tailwindDarkerGreen : tailwindDarkerRed;
        }

        document.getElementById('networkRulesDiv').style.backgroundColor = this.peerCreateEligibilityAllowedIPs ? tailwindLightGreen : tailwindLightRed;
      }

      // check all
      if (mode === 'all') {
        const modes = ['name', 'endpoint', 'peerCount', 'allowedIPs'];
        for (const mode of modes) {
          this.checkPeerCreateEligibility(mode);
        }
      }

      // final AND check
      this.peerCreateEligibility = this.peerCreateEligibilityName && (this.peerCreateEligibilityEndpoint || this.peerCreate === 'roaming') && this.peerCreateEligibilityPeers && this.peerCreateEligibilityAllowedIPs;
    },
    getConnectionId(peer1, peer2) {
      if (peer1.localeCompare(peer2, 'en') === 1) return `${peer1}*${peer2}`;
      return `${peer2}*${peer1}`;
    },
    async peerConfigEditHandle(mode) {
      const tailwindLightGreen = 'rgb(240 253 244)';
      const tailwindDarkerGreen = 'rgb(187 247 208)';
      const tailwindLightRed = 'rgb(254 242 242)';
      const tailwindDarkerRed = 'rgb(254 202 202)';
      const tailwindWhite = 'rgb(255 255 255)';

      if (mode === 'init') {
        this.peerConfigEditData.name = this.network.peers[this.peerConfigId]['name'];
        this.peerConfigEditData.address = this.network.peers[this.peerConfigId]['address'];
        this.peerConfigEditData.endpoint = this.network.peers[this.peerConfigId]['endpoint'].replace('static->', '').replace('roaming->', '');
        this.peerConfigEditData.endpointToggle = this.network.peers[this.peerConfigId]['endpoint'].startsWith('static->');

        // store all the conections related to this peer
        this.peerConfigEditData.connectionIds = [];
        this.peerConfigEditData.isConnectionEnabled = [];
        this.peerConfigEditData.persistentKeepaliveData = [];
        this.peerConfigEditData.allowedIPsAtoB = [];
        this.peerConfigEditData.allowedIPsBtoA = [];
        for (const connectionId of Object.keys(this.network.connections)) {
          if (connectionId.includes(this.peerConfigId)) {
            this.peerConfigEditData.connectionIds.push(connectionId);
            this.peerConfigEditData.isConnectionEnabled.push(this.network.connections[connectionId]['enabled']);
            this.peerConfigEditData.persistentKeepaliveData.push(this.network.connections[connectionId]['persistentKeepalive'] === 'on');
            this.peerConfigEditData.allowedIPsAtoB.push(this.network.connections[connectionId]['allowedIPs:a->b']);
            this.peerConfigEditData.allowedIPsBtoA.push(this.network.connections[connectionId]['allowedIPs:b->a']);
          }
        }

        try {
          for (const connectionId of this.peerConfigEditData.connectionIds) {
            if (this.network.connections[connectionId]['enabled']) {
              document.getElementById(`peerConfigEditData.${connectionId}.enabled`).style.backgroundColor = tailwindLightGreen;
            } else {
              document.getElementById(`peerConfigEditData.${connectionId}.enabled`).style.backgroundColor = tailwindDarkerRed;
            }
          }
        } catch (e) {
          await new Promise(r => setTimeout(r, 100));
          await this.peerConfigEditHandle(mode);
        }
        return;
      }

      let errorNotFound = true;
      const changedFields = { peers: {}, connections: {} };
      changedFields.peers[this.peerConfigId] = {};
      if (['check-changes', 'check-changes-connection', 'check-all'].includes(mode)) {
        for (const peerConfigField of ['name', 'address', 'endpoint']) {
          let assignedColor = tailwindWhite;
          if (peerConfigField === 'endpoint') {
            assignedColor = this.network.peers[this.peerConfigId][peerConfigField].replace('static->', '').replace('roaming->', '') !== '' ? tailwindWhite : tailwindDarkerRed;
            if (this.peerConfigEditData[peerConfigField] !== this.network.peers[this.peerConfigId][peerConfigField].replace('static->', '').replace('roaming->', '')) {
              assignedColor = this.checkField(peerConfigField, this.peerConfigEditData[peerConfigField]) ? tailwindDarkerGreen : tailwindDarkerRed;
              changedFields.peers[this.peerConfigId][peerConfigField] = this.peerConfigEditData[peerConfigField];
            }
          } else if (this.peerConfigEditData[peerConfigField] !== this.network.peers[this.peerConfigId][peerConfigField]) {
            assignedColor = this.checkField(peerConfigField, this.peerConfigEditData[peerConfigField]) ? tailwindDarkerGreen : tailwindDarkerRed;
            changedFields.peers[this.peerConfigId][peerConfigField] = this.peerConfigEditData[peerConfigField];
          }
          try {
            errorNotFound &= assignedColor !== tailwindDarkerRed;
            document.getElementById(`peerConfigEditData.${peerConfigField}`).style.backgroundColor = assignedColor;
          } catch (e) {
            errorNotFound &= false;
            await new Promise(r => setTimeout(r, 100));
            await this.peerConfigEditHandle(mode);
          }
        }
      }

      const changedConnections = {};
      if (['check-changes', 'check-changes-connection', 'check-all'].includes(mode)) {
        for (const [index, connectionId] of Object.entries(this.peerConfigEditData.connectionIds)) {
          const changedSubFields = {};
          let assignedColor = tailwindLightGreen;
          if (!this.peerConfigEditData.isConnectionEnabled[index]) {
            assignedColor = tailwindLightRed;
          }
          if (this.peerConfigEditData.isConnectionEnabled[index] !== this.network.connections[connectionId].enabled) {
            changedSubFields['enabled'] = this.peerConfigEditData.isConnectionEnabled[index];
          }
          document.getElementById(`peerConfigEditData.${connectionId}.enabled`).style.backgroundColor = assignedColor;

          assignedColor = tailwindWhite;
          if (this.peerConfigEditData.allowedIPsAtoB[index] !== this.network.connections[connectionId]['allowedIPs:a->b']) {
            assignedColor = this.checkField('allowedIPs', this.peerConfigEditData.allowedIPsAtoB[index]) ? tailwindDarkerGreen : tailwindDarkerRed;
            changedSubFields['allowedIPs:a->b'] = this.peerConfigEditData.allowedIPsAtoB[index];
          }
          errorNotFound &= assignedColor !== tailwindDarkerRed;
          document.getElementById(`peerConfigEditData.${connectionId}.allowedIPsAtoB`).style.backgroundColor = assignedColor;

          assignedColor = tailwindWhite;
          if (this.peerConfigEditData.allowedIPsBtoA[index] !== this.network.connections[connectionId]['allowedIPs:b->a']) {
            assignedColor = this.checkField('allowedIPs', this.peerConfigEditData.allowedIPsBtoA[index]) ? tailwindDarkerGreen : tailwindDarkerRed;
            changedSubFields['allowedIPs:b->a'] = this.peerConfigEditData.allowedIPsBtoA[index];
          }
          errorNotFound &= assignedColor !== tailwindDarkerRed;
          document.getElementById(`peerConfigEditData.${connectionId}.allowedIPsBtoA`).style.backgroundColor = assignedColor;

          if (Object.keys(changedSubFields).length > 0) {
            changedConnections[connectionId] = changedSubFields;
          }
        }
        if (Object.keys(changedConnections).length > 0) {
          changedFields.connections = changedConnections;
        }
      }
      this.peerEditDisableSaveChanges = !errorNotFound || (Object.keys(changedFields.peers[this.peerConfigId]).length + Object.keys(changedFields.connections).length === 0);
      return [changedFields, errorNotFound];
    },
    checkField(fieldName, fieldVariable) {
      // check name
      if (fieldName === 'name') {
        return fieldVariable.length > 0;
      }

      // TODO: change the hardcoded IP subnet
      // TODO: check to see if a duplicate exists
      if (fieldName === 'address') {
        let addressCheck = true;
        addressCheck &&= fieldVariable.startsWith('10.8.0.');
        addressCheck &&= fieldVariable.replace('10.8.0.', '').match('^[0-9]*$');
        addressCheck &&= parseInt(fieldVariable.replace('10.8.0.', ''), 10) >= 0 && parseInt(fieldVariable.replace('10.8.0.', ''), 10) <= 255;
        return addressCheck;
      }

      // check endpoint
      if (fieldName === 'endpoint') {
        let endpointCheck = false;
        endpointCheck = fieldVariable.replace('static->', '').match('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
        endpointCheck ||= fieldVariable.match('^(((?!\\-))(xn\\-\\-)?[a-z0-9\\-_]{0,61}[a-z0-9]{1,1}\\.)*(xn\\-\\-)?([a-z0-9\\-]{1,61}|[a-z0-9\\-]{1,30})\\.[a-z]{2,}:(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
        return endpointCheck;
      }

      // check peer count
      if (fieldName === 'peerCount') {
        return this.attachedPeers.length > 0;
      }

      // check allowedIPs
      if (fieldName === 'allowedIPs') {
        return fieldVariable.match('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9]))(,((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9])))*$');
      }

      return false;
    },
    async peerConfigEditSave() {
      const [changedFields, errorNotFound] = await this.peerConfigEditHandle('check-all');
      if (!errorNotFound) return;

      this.peerEditChangedFields = changedFields;

      this.peerEditOldConfig.peers[this.peerConfigId] = {
        name: this.network.peers[this.peerConfigId].name,
        address: this.network.peers[this.peerConfigId].address,
        publicKey: this.network.peers[this.peerConfigId].publicKey,
        privateKey: this.network.peers[this.peerConfigId].privateKey,
        endpoint: this.network.peers[this.peerConfigId].endpoint,
      };
      this.peerEditOldConfig.connections = {};
      for (const [connectionId, connection] of Object.entries(this.network.connections)) {
        if (connectionId.includes(this.peerConfigId)) {
          this.peerEditOldConfig.connections[connectionId] = {
            preSharedKey: connection.preSharedKey,
            enabled: connection.enabled,
            'allowedIPs:a->b': connection['allowedIPs:a->b'],
            'allowedIPs:b->a': connection['allowedIPs:b->a'],
          };
        }
      }

      this.peerEditNewConfig = JSON.parse(JSON.stringify(this.peerEditOldConfig)); // deep copy
      for (const [field, value] of Object.entries(this.peerEditChangedFields.peers[this.peerConfigId])) {
        this.peerEditNewConfig.peers[this.peerConfigId][field] = value;
      }
      for (const [connectionId, connection] of Object.entries(this.peerEditChangedFields.connections)) {
        for (const [field, value] of Object.entries(connection)) {
          this.peerEditNewConfig.connections[connectionId][field] = value;
        }
      }
    },
  },
  filters: {
    bytes,
    timeago: value => {
      return timeago().format(value);
    },
  },
  mounted() {
    this.api = new API();
    this.wg = new WG();
    this.api.getSession()
      .then(session => {
        this.authenticated = session.authenticated;
        this.requiresPassword = session.requiresPassword;
        this.refresh().catch(err => {
          alert(err.message || err.toString());
        });
      })
      .catch(err => {
        alert(err.message || err.toString());
      });

    setInterval(() => {
      this.refresh().catch(error => {
        console.log(error);
      });
    }, 1000);

    Promise.resolve().then(async () => {
      const currentRelease = await this.api.getRelease();
      const latestRelease = await fetch('https://weejewel.github.io/wg-easy/changelog.json')
        .then(res => res.json())
        .then(releases => {
          const releasesArray = Object.entries(releases).map(([version, changelog]) => ({
            version: parseInt(version, 10),
            changelog,
          }));
          releasesArray.sort((a, b) => {
            return b.version - a.version;
          });

          return releasesArray[0];
        });

      console.log(`Current Release: ${currentRelease}`);
      console.log(`Latest Release: ${latestRelease.version}`);

      if (currentRelease >= latestRelease.version) return;

      this.currentRelease = currentRelease;
      this.latestRelease = latestRelease;
    }).catch(console.error);
  },
});
