import typing as t
import unittest
from unittest import mock

import flask
import flask_socketio
from aprsd import conf  # noqa: F401
from aprsd.packets import core
from click.testing import CliRunner
from oslo_config import cfg

from aprsd_webchat_extension.cmds import webchat

from . import fake

CONF = cfg.CONF
F = t.TypeVar("F", bound=t.Callable[..., t.Any])


class TestDeriveAllowedOrigins(unittest.TestCase):
    """Tests for _derive_allowed_origins() — issue #15.

    All three deployment scenarios are covered:
      - DigiPi / direct LAN (auto-detect, no config)
      - aprsradio.online (public_url set, reverse proxy)
      - Power user (allowed_origins explicit override)
    """

    def setUp(self):
        # Reset config options between tests
        CONF.set_override("public_url", "", group="aprsd_webchat_extension")
        CONF.set_override("allowed_origins", [], group="aprsd_webchat_extension")

    # ------------------------------------------------------------------
    # Layer 1 — explicit allowed_origins override
    # ------------------------------------------------------------------

    def test_explicit_allowed_origins_returns_exact_list(self):
        """When allowed_origins is set it is returned verbatim."""
        explicit = ["http://10.0.0.5:8001", "https://custom.example.com"]
        CONF.set_override("allowed_origins", explicit, group="aprsd_webchat_extension")
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertEqual(sorted(result), sorted(explicit))

    def test_explicit_allowed_origins_skips_auto_detect(self):
        """allowed_origins overrides auto-detection entirely — no extra entries."""
        explicit = ["http://10.0.0.5:8001"]
        CONF.set_override("allowed_origins", explicit, group="aprsd_webchat_extension")
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertEqual(result, explicit)

    def test_explicit_allowed_origins_skips_public_url(self):
        """allowed_origins takes full precedence — public_url is ignored."""
        explicit = ["http://10.0.0.5:8001"]
        CONF.set_override("allowed_origins", explicit, group="aprsd_webchat_extension")
        CONF.set_override(
            "public_url",
            "https://mycall.aprsradio.online",
            group="aprsd_webchat_extension",
        )
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertEqual(result, explicit)
        self.assertNotIn("https://mycall.aprsradio.online", result)

    # ------------------------------------------------------------------
    # Layer 2 — public_url (aprsradio.online / reverse proxy)
    # ------------------------------------------------------------------

    def test_public_url_origin_included_in_result(self):
        """public_url scheme+host is included alongside auto-detected origins."""
        CONF.set_override(
            "public_url",
            "https://mycall.aprsradio.online",
            group="aprsd_webchat_extension",
        )
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIn("https://mycall.aprsradio.online", result)

    def test_public_url_path_is_stripped(self):
        """Only the scheme+host portion of public_url is used — path is ignored."""
        CONF.set_override(
            "public_url",
            "https://mycall.aprsradio.online/webchat/",
            group="aprsd_webchat_extension",
        )
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIn("https://mycall.aprsradio.online", result)
        self.assertNotIn("https://mycall.aprsradio.online/webchat/", result)

    def test_public_url_with_port_included(self):
        """public_url with an explicit port is handled correctly."""
        CONF.set_override(
            "public_url",
            "https://mycall.aprsradio.online:9443",
            group="aprsd_webchat_extension",
        )
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIn("https://mycall.aprsradio.online:9443", result)

    def test_invalid_public_url_is_ignored(self):
        """A malformed public_url does not crash and is simply omitted."""
        CONF.set_override("public_url", "not-a-url", group="aprsd_webchat_extension")
        # Should not raise; auto-detected origins are still returned
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIsInstance(result, list)
        self.assertNotIn("not-a-url", result)

    # ------------------------------------------------------------------
    # Layer 3 — auto-detection (DigiPi / direct LAN)
    # ------------------------------------------------------------------

    def test_localhost_always_included(self):
        """http://localhost:<port> is always in the auto-detected set."""
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIn("http://localhost:8001", result)

    def test_loopback_ip_always_included(self):
        """http://127.0.0.1:<port> is always in the auto-detected set."""
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIn("http://127.0.0.1:8001", result)

    def test_specific_bind_ip_included(self):
        """When bound to a specific IP (not 0.0.0.0) that IP origin is included."""
        result = webchat._derive_allowed_origins("192.168.1.42", 8001)
        self.assertIn("http://192.168.1.42:8001", result)

    def test_wildcard_bind_does_not_add_0000_origin(self):
        """Binding to 0.0.0.0 must not produce an http://0.0.0.0:port origin."""
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertNotIn("http://0.0.0.0:8001", result)

    def test_port_respected_in_all_origins(self):
        """All auto-detected origins use the supplied port number."""
        result = webchat._derive_allowed_origins("0.0.0.0", 9000)
        for origin in result:
            # Every auto-detect origin must end with :9000
            self.assertTrue(
                origin.endswith(":9000"),
                f"Expected origin to use port 9000: {origin}",
            )

    @mock.patch("aprsd_webchat_extension.cmds.webchat.socket.gethostname")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.socket.gethostbyname")
    def test_digipi_lan_ip_included(self, mock_byname, mock_hostname):
        """DigiPi scenario: hostname resolves to a LAN IP → origin included."""
        mock_hostname.return_value = "raspberrypi"
        mock_byname.return_value = "192.168.1.55"
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIn("http://192.168.1.55:8001", result)
        self.assertIn("http://raspberrypi:8001", result)
        self.assertIn("http://raspberrypi.local:8001", result)

    @mock.patch("aprsd_webchat_extension.cmds.webchat.socket.gethostname")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.socket.gethostbyname")
    def test_hostname_resolution_failure_does_not_crash(
        self, mock_byname, mock_hostname
    ):
        """OSError during hostname resolution is silently logged, not raised."""
        mock_hostname.return_value = "raspberrypi"
        mock_byname.side_effect = OSError("Name or service not known")
        # Should not raise; localhost origins are still returned
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIn("http://localhost:8001", result)

    @mock.patch("aprsd_webchat_extension.cmds.webchat.socket.gethostname")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.socket.gethostbyname")
    def test_aprsradio_online_scenario(self, mock_byname, mock_hostname):
        """aprsradio.online: public_url set, auto-detect still works for localhost."""
        mock_hostname.return_value = "webchat-container-1"
        mock_byname.return_value = "172.17.0.3"
        CONF.set_override(
            "public_url",
            "https://mycall.aprsradio.online",
            group="aprsd_webchat_extension",
        )
        result = webchat._derive_allowed_origins("127.0.0.1", 8001)
        # Public URL origin must be present
        self.assertIn("https://mycall.aprsradio.online", result)
        # Localhost still present for admin/SSH access
        self.assertIn("http://localhost:8001", result)
        self.assertIn("http://127.0.0.1:8001", result)

    def test_returns_list_not_set(self):
        """Return type must be a list (Flask-SocketIO requires a list or string)."""
        result = webchat._derive_allowed_origins("0.0.0.0", 8001)
        self.assertIsInstance(result, list)


class TestLocationEndpoint(unittest.TestCase):
    """Tests for the /location/<callsign> POST endpoint (issue #13)."""

    def setUp(self):
        CONF.callsign = fake.FAKE_TO_CALLSIGN
        CONF.trace_enabled = False
        # Ensure SocketIO is initialised so flask_app is ready for test client
        webchat.init_flask("DEBUG", False)
        self.client = webchat.flask_app.test_client()

    @mock.patch("aprsd_webchat_extension.cmds.webchat.populate_callsign_location")
    def test_location_returns_204_for_normal_callsign(self, mock_populate):
        """POST /location/<callsign> must return HTTP 204 for a trackable callsign."""
        response = self.client.post("/location/W1AW")
        self.assertEqual(response.status_code, 204)
        mock_populate.assert_called_once_with("W1AW")

    @mock.patch("aprsd_webchat_extension.cmds.webchat.populate_callsign_location")
    def test_location_returns_204_for_no_track_callsign(self, mock_populate):
        """POST /location/<callsign> must return HTTP 204 even for no-track callsigns."""
        # ANSRVR is in callsign_no_track — populate_callsign_location should not be called
        response = self.client.post("/location/ANSRVR")
        self.assertEqual(response.status_code, 204)
        mock_populate.assert_not_called()

    @mock.patch("aprsd_webchat_extension.cmds.webchat.populate_callsign_location")
    def test_location_does_not_track_blocked_callsigns(self, mock_populate):
        """Callsigns in callsign_no_track must not trigger a location lookup."""
        for callsign in webchat.callsign_no_track:
            mock_populate.reset_mock()
            response = self.client.post(f"/location/{callsign}")
            self.assertEqual(
                response.status_code,
                204,
                f"Expected 204 for blocked callsign {callsign}",
            )
            mock_populate.assert_not_called()

    @mock.patch("aprsd_webchat_extension.cmds.webchat.populate_callsign_location")
    def test_location_response_body_is_empty(self, mock_populate):
        """The 204 response body must be empty."""
        response = self.client.post("/location/K1ABC")
        self.assertEqual(response.data, b"")


class TestSendMessageCommand(unittest.TestCase):
    def config_and_init(self, login=None, password=None):
        CONF.callsign = fake.FAKE_TO_CALLSIGN
        CONF.trace_enabled = False
        CONF.watch_list.packet_keep_count = 1
        if login:
            CONF.aprs_network.login = login
        if password:
            CONF.aprs_network.password = password

    @mock.patch("aprsd.log.log.setup_logging")
    def test_init_flask(self, mock_logging):
        """Make sure we get an error if there is no login and config."""

        CliRunner()
        self.config_and_init()

        socketio = webchat.init_flask("DEBUG", False)
        self.assertIsInstance(socketio, flask_socketio.SocketIO)
        self.assertIsInstance(webchat.flask_app, flask.Flask)

    @mock.patch("aprsd_webchat_extension.cmds.webchat.SentMessages")
    def test_process_ack_packet(
        self,
        mock_sent_messages,
    ):
        self.config_and_init()
        # Create an ACK packet
        packet = fake.fake_ack_packet()
        ack_num = packet.get("msgNo")

        # Mock SentMessages to return a message
        mock_msgs = mock.MagicMock()
        mock_msgs.get.return_value = {"message": "test"}
        mock_sent_messages.return_value = mock_msgs

        mock_queue = mock.MagicMock()
        socketio = mock.MagicMock()
        wcp = webchat.WebChatProcessPacketThread(mock_queue, socketio)

        wcp.process_ack_packet(packet)
        # Verify SentMessages methods were called
        mock_msgs.ack.assert_called_once_with(ack_num)
        mock_msgs.get.assert_called_once_with(ack_num)
        # Verify socketio.emit was called with the correct arguments
        socketio.emit.assert_called_once()
        call_args = socketio.emit.call_args
        assert call_args[0][0] == "ack"
        assert call_args[0][1] == {"message": "test"}
        assert call_args[1]["namespace"] == "/sendmsg"

    @mock.patch("aprsd_webchat_extension.cmds.webchat.APRSDClient")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.populate_callsign_location")
    def test_process_our_message_packet(
        self,
        mock_populate_location,
        mock_client_class,
    ):
        self.config_and_init()
        packet = fake.fake_packet(
            message="blah",
            msg_number=1,
            message_format=core.PACKET_TYPE_MESSAGE,
        )
        # Mock the client with driver.transport attribute
        mock_client = mock.MagicMock()
        mock_driver = mock.MagicMock()
        mock_driver.transport = "aprs-is"
        mock_client.driver = mock_driver
        mock_client_class.return_value = mock_client
        mock_queue = mock.MagicMock()
        socketio = mock.MagicMock()
        wcp = webchat.WebChatProcessPacketThread(mock_queue, socketio)

        wcp.process_our_message_packet(packet)
        # The method should emit the packet to the browser
        socketio.emit.assert_called_once()
        # Check that emit was called with the correct arguments
        call_args = socketio.emit.call_args
        assert call_args[0][0] == "new"
        assert call_args[0][1] == packet.__dict__
        assert call_args[1]["namespace"] == "/sendmsg"


class TestSendMessageNamespace(unittest.TestCase):
    """Tests for WebSocket GPS beacon handling with symbol parameter."""

    def config_and_init(self):
        CONF.callsign = fake.FAKE_TO_CALLSIGN
        CONF.trace_enabled = False

    @mock.patch("aprsd_webchat_extension.cmds.webchat.tx")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.socketio")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.packets")
    def test_on_gps_with_symbol(self, mock_packets, mock_socketio, mock_tx):
        """Test on_gps handler with symbol parameter."""
        self.config_and_init()

        # Create instance of SendMessageNamespace
        namespace = webchat.SendMessageNamespace("/sendmsg")

        # Call on_gps with symbol parameter
        data = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "path": "WIDE1-1",
            "symbol": "/-",  # House symbol
        }
        namespace.on_gps(data)

        # Verify BeaconPacket was created with correct symbol
        mock_packets.BeaconPacket.assert_called_once()
        call_kwargs = mock_packets.BeaconPacket.call_args[1]
        assert call_kwargs["symbol"] == "-"
        assert call_kwargs["symbol_table"] == "/"
        assert call_kwargs["latitude"] == 37.7749
        assert call_kwargs["longitude"] == -122.4194

        # Verify tx.send was called to transmit the beacon
        mock_tx.send.assert_called_once()

        # Verify socketio.emit was called with symbol in response
        mock_socketio.emit.assert_called_once()
        emit_args = mock_socketio.emit.call_args
        assert emit_args[0][0] == "gps_beacon_sent"
        assert emit_args[0][1]["symbol"] == "/-"

    @mock.patch("aprsd_webchat_extension.cmds.webchat.tx")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.socketio")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.packets")
    def test_on_gps_without_symbol_backward_compatible(
        self, mock_packets, mock_socketio, mock_tx
    ):
        """Test on_gps handler backward compatibility without symbol parameter."""
        self.config_and_init()

        # Create instance of SendMessageNamespace
        namespace = webchat.SendMessageNamespace("/sendmsg")

        # Call on_gps without symbol parameter (old client behavior)
        data = {"latitude": 40.7128, "longitude": -74.0060, "path": "WIDE1-1,WIDE2-1"}
        namespace.on_gps(data)

        # Verify BeaconPacket was created with default car symbol
        mock_packets.BeaconPacket.assert_called_once()
        call_kwargs = mock_packets.BeaconPacket.call_args[1]
        assert call_kwargs["symbol"] == ">"  # Default car symbol code
        assert call_kwargs["symbol_table"] == "/"  # Default primary table

        # Verify tx.send was called to transmit the beacon
        mock_tx.send.assert_called_once()

        # Verify socketio.emit was called with default symbol in response
        mock_socketio.emit.assert_called_once()
        emit_args = mock_socketio.emit.call_args
        assert emit_args[0][0] == "gps_beacon_sent"
        assert emit_args[0][1]["symbol"] == "/>"  # Default car symbol

    @mock.patch("aprsd_webchat_extension.cmds.webchat.tx")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.socketio")
    @mock.patch("aprsd_webchat_extension.cmds.webchat.packets")
    def test_on_gps_with_alternate_table_symbol(
        self, mock_packets, mock_socketio, mock_tx
    ):
        """Test on_gps handler with alternate table symbol."""
        self.config_and_init()

        # Create instance of SendMessageNamespace
        namespace = webchat.SendMessageNamespace("/sendmsg")

        # Call on_gps with alternate table symbol
        data = {
            "latitude": 51.5074,
            "longitude": -0.1278,
            "symbol": "\\>",  # Car with overlay (alternate table)
        }
        namespace.on_gps(data)

        # Verify BeaconPacket was created with alternate table
        mock_packets.BeaconPacket.assert_called_once()
        call_kwargs = mock_packets.BeaconPacket.call_args[1]
        assert call_kwargs["symbol"] == ">"
        assert call_kwargs["symbol_table"] == "\\"

        # Verify tx.send was called to transmit the beacon
        mock_tx.send.assert_called_once()

        # Verify response includes correct symbol
        emit_args = mock_socketio.emit.call_args
        assert emit_args[0][1]["symbol"] == "\\>"
