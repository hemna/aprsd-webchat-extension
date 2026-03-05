import typing as t
import unittest
from unittest import mock

import flask
import flask_socketio
from aprsd import conf  # noqa: F401
from aprsd.packets import core
from click.testing import CliRunner
from oslo_config import cfg

from aprsd_webchat_extension.cmds import webchat  # noqa

from . import fake

CONF = cfg.CONF
F = t.TypeVar("F", bound=t.Callable[..., t.Any])


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

        # Verify response includes correct symbol
        emit_args = mock_socketio.emit.call_args
        assert emit_args[0][1]["symbol"] == "\\>"
