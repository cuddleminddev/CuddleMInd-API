import 'dart:convert';

import 'package:cuddle_mind/main.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class DoctorChatController extends GetxController {
  late IO.Socket socket;

  final RxBool isConnected = false.obs;
  final RxString currentStatus = 'Disconnected'.obs;
  final RxString incomingBookingId = ''.obs;
  final RxString patientName = ''.obs;
  final RxString patientId = ''.obs;
  final RxString sessionType = ''.obs;
  final RxString sessionId = ''.obs;
  final RxString zegocloudRoomId = ''.obs;
  final Rx<DateTime?> scheduledAt = Rx<DateTime?>(null);
  final RxBool showIncomingSessionPopup = false.obs;

  final Duration _reconnectDelay = Duration(seconds: 5);
  final RxString doctorId = ''.obs;
  final RxString doctorName = ''.obs;

  // Connection state management
  final RxInt reconnectAttempts = 0.obs;
  final RxBool isReconnecting = false.obs;
  static const int maxReconnectAttempts = 5;

  @override
  void onInit() {
    super.onInit();
    _initSocketConnection();
  }

  void _initSocketConnection() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString("user_id") ?? "";
    final name = prefs.getString("name") ?? "";

    doctorId.value = id;
    doctorName.value = name;

    if (id.isEmpty) {
      _logError('Doctor ID not found in preferences');
      currentStatus.value = 'Authentication Error';
      return;
    }

    try {
      socket = IO.io(
        baseUrl.replaceAll("/v1", ""),
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .enableAutoConnect()
            .setQuery({
              'userId': id,
              'role': 'doctor',
            })
            .build(),
      );

      socket.connect();
      _setupSocketListeners();
      currentStatus.value = 'Connecting...';
    } catch (e) {
      _logError('Failed to initialize socket connection: $e');
      currentStatus.value = 'Connection Failed';
    }
  }

  void _setupSocketListeners() {
    socket.onConnect((_) {
      isConnected.value = true;
      currentStatus.value = 'Connected';
      reconnectAttempts.value = 0;
      isReconnecting.value = false;
      _logInfo('Socket connected successfully');
      _emitDoctorOnlineStatus();
    });

    socket.onDisconnect((reason) {
      isConnected.value = false;
      currentStatus.value = 'Disconnected';
      _logInfo('Socket disconnected. Reason: $reason');
      if (reason != 'io client disconnect') {
        _handleReconnection();
      }
    });

    socket.onConnectError((error) {
      _logError('Connection error: $error');
      currentStatus.value = 'Connection Error';
      _handleReconnection();
    });

    socket.onReconnect((attemptNumber) {
      _logInfo('Reconnected after $attemptNumber attempts');
      isReconnecting.value = false;
      reconnectAttempts.value = 0;
    });

    socket.onReconnectError((error) {
      _logError('Reconnection error: $error');
      reconnectAttempts.value++;
    });

    socket.on('instant_session_started', _handleInstantSessionStarted);
    socket.on('session_cancelled', _handleSessionCancelled);
    socket.on('patient_disconnected', _handlePatientDisconnected);
    socket.on('session_reminder', _handleSessionReminder);
  }

  void _handleInstantSessionStarted(dynamic data) {
    _logInfo(
      "⚡ Received 'instant_session_started' payload:\n${_prettyPrintJson(data)}",
    );

    try {
      Map<String, dynamic> payload;
      if (data is String) {
        payload = jsonDecode(data);
      } else if (data is Map<String, dynamic>) {
        payload = data;
      } else {
        throw Exception('Invalid payload format');
      }

      if (!_validateInstantSessionPayload(payload)) {
        return;
      }

      incomingBookingId.value = payload['bookingId'] ?? '';
      patientId.value = payload['patientId'] ?? '';
      // Use patientName directly from payload — no extra HTTP call needed
      patientName.value = payload['patientName'] ?? 'Patient';
      sessionType.value = payload['sessionType'] ?? 'video';
      sessionId.value = payload['sessionId'] ?? '';
      zegocloudRoomId.value = payload['zegocloudRoomId'] ?? '';

      if (payload['scheduledAt'] != null) {
        try {
          scheduledAt.value =
              DateTime.parse(payload['scheduledAt'].toString());
        } catch (e) {
          _logError('Failed to parse scheduledAt: $e');
          scheduledAt.value = DateTime.now();
        }
      } else {
        scheduledAt.value = DateTime.now();
      }

      showIncomingSessionPopup.value = true;
      _notifyIncomingSession();

      _logInfo("✅ Session processed.");
      _logInfo("📋 Booking ID   : ${incomingBookingId.value}");
      _logInfo("🔑 Session ID   : ${sessionId.value}");
      _logInfo("👤 Patient ID   : ${patientId.value}");
      _logInfo("👤 Patient Name : ${patientName.value}");
      _logInfo("📱 Session Type : ${sessionType.value}");
      _logInfo("🏠 Room ID      : ${zegocloudRoomId.value}");
      _logInfo("⏰ Scheduled At : ${scheduledAt.value}");
    } catch (e) {
      _logError("❌ Error processing 'instant_session_started': $e");
      _showErrorDialog('Failed to process incoming session.');
    }
  }

  void _handleSessionCancelled(dynamic data) {
    _logInfo(
      "🚫 Received 'session_cancelled' payload:\n${_prettyPrintJson(data)}",
    );
    try {
      final payload = data is String ? jsonDecode(data) : data;
      final bookingId = payload['bookingId'];

      if (bookingId == incomingBookingId.value) {
        showIncomingSessionPopup.value = false;
        _clearSessionData();
        Get.snackbar(
          'Session Cancelled',
          'The patient has cancelled the session',
          snackPosition: SnackPosition.TOP,
          backgroundColor: Colors.orange,
          colorText: Colors.white,
        );
      }
    } catch (e) {
      _logError("Error handling session cancellation: $e");
    }
  }

  void _handleReconnection() {
    if (!isReconnecting.value &&
        reconnectAttempts.value < maxReconnectAttempts) {
      isReconnecting.value = true;
      reconnectAttempts.value++;
      _logInfo(
        "🔄 Attempting to reconnect... (Attempt ${reconnectAttempts.value})",
      );
      Future.delayed(_reconnectDelay, () {
        socket.connect();
      });
    } else if (reconnectAttempts.value >= maxReconnectAttempts) {
      _logError("❌ Max reconnection attempts reached. Please try again later.");
      currentStatus.value = 'Reconnection Failed';
    }
  }

  void _handlePatientDisconnected(dynamic data) {
    _logInfo(
      "📱 Received 'patient_disconnected' payload:\n${_prettyPrintJson(data)}",
    );
    // handle disconnection if needed
  }

  void _handleSessionReminder(dynamic data) {
    _logInfo(
      "⏰ Received 'session_reminder' payload:\n${_prettyPrintJson(data)}",
    );
    // handle reminder if needed
  }

  bool _validateInstantSessionPayload(Map<String, dynamic> payload) {
    final requiredFields = ['bookingId', 'patientId', 'doctorId'];

    for (String field in requiredFields) {
      if (!payload.containsKey(field) ||
          payload[field] == null ||
          payload[field].toString().isEmpty) {
        _logError("❌ Missing required field: $field");
        return false;
      }
    }

    if (payload['doctorId'] != doctorId.value) {
      _logError(
        "❌ Session not intended for this doctor. Expected: ${doctorId.value}, Got: ${payload['doctorId']}",
      );
      return false;
    }

    return true;
  }

  void _emitDoctorOnlineStatus() {
    socket.emit('doctor_online', {
      'doctorId': doctorId.value,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  void _notifyIncomingSession() {
    _logInfo("🔔 Notifying doctor of incoming session");
  }

  void _clearSessionData() {
    incomingBookingId.value = '';
    patientName.value = '';
    patientId.value = '';
    sessionType.value = '';
    sessionId.value = '';
    zegocloudRoomId.value = '';
    scheduledAt.value = null;
  }

  void acceptSession() {
    if (incomingBookingId.value.isNotEmpty) {
      showIncomingSessionPopup.value = false;
      startConsultationSession(incomingBookingId.value);

      Get.toNamed(
        '/consultation',
        arguments: {
          'bookingId': incomingBookingId.value,
          'patientId': patientId.value,
          'patientName': patientName.value,
          'sessionType': sessionType.value,
          'sessionId': sessionId.value,
          'zegocloudRoomId': zegocloudRoomId.value,
        },
      );
    }
  }

  void rejectSession() {
    if (incomingBookingId.value.isNotEmpty) {
      _rejectSessionAPI(incomingBookingId.value);
      showIncomingSessionPopup.value = false;
      _clearSessionData();
    }
  }

  Future<void> _rejectSessionAPI(String bookingId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString("access_token") ?? "";

      final response = await http.post(
        Uri.parse(baseUrl + '/consultation-sessions/reject'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          "bookingId": bookingId,
          "rejectedBy": doctorId.value,
          "reason": "Doctor unavailable",
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _logInfo("✅ Session rejected successfully");
      } else {
        _logError("❌ Failed to reject session: ${response.body}");
      }
    } catch (e) {
      _logError("❌ rejectSession Error: $e");
    }
  }

  Future<void> startConsultationSession(String bookingId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString("access_token") ?? "";
      final docId = prefs.getString("user_id") ?? "";

      final response = await http.post(
        Uri.parse(baseUrl + '/consultation-sessions/start'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({"bookingId": bookingId, "createdBy": docId}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _logInfo("📢 Session started successfully.");
        await connectConsultationSession(bookingId);
      } else {
        _logError("❌ Failed to start session: ${response.body}");
        _showErrorDialog('Failed to start consultation session');
      }
    } catch (e) {
      _logError("❌ startConsultationSession Error: $e");
      _showErrorDialog('Network error occurred');
    }
  }

  Future<void> connectConsultationSession(String bookingId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString("access_token") ?? "";

      final response = await http.patch(
        Uri.parse(baseUrl + '/consultation-sessions/connect'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({"bookingId": bookingId}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _logInfo("✅ Session marked as ongoing.");
      } else {
        _logError("❌ Failed to connect session: ${response.body}");
      }
    } catch (e) {
      _logError("❌ connectConsultationSession Error: $e");
    }
  }

  Future<void> endConsultationSession({
    required String bookingId,
    required String notes,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString("access_token") ?? "";
      final docId = prefs.getString("user_id") ?? "";

      final response = await http.patch(
        Uri.parse(baseUrl + '/consultation-sessions/end'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          "bookingId": bookingId,
          "endedBy": docId,
          "notes": notes,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        _logInfo(
          "⏹️ Session ended at ${data['endedAt']} (Duration: ${data['durationInMinutes']} min)",
        );
        _clearSessionData();
      } else {
        _logError("❌ Failed to end session: ${response.body}");
      }
    } catch (e) {
      _logError("❌ endConsultationSession Error: $e");
    }
  }

  void _showErrorDialog(String message) {
    Get.dialog(
      AlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('OK')),
        ],
      ),
    );
  }

  void reconnectManually() {
    if (!isConnected.value && !isReconnecting.value) {
      reconnectAttempts.value = 0;
      socket.connect();
    }
  }

  void _logInfo(String msg) => print('[DoctorChat] INFO: $msg');
  void _logError(String msg) => print('[DoctorChat] ERROR: $msg');

  String _prettyPrintJson(dynamic data) {
    try {
      final decoded = data is String ? jsonDecode(data) : data;
      const encoder = JsonEncoder.withIndent('  ');
      return encoder.convert(decoded);
    } catch (e) {
      return 'Invalid JSON: $data';
    }
  }

  @override
  void onClose() {
    try {
      socket.dispose();
    } catch (e) {
      _logError('Error during socket dispose: $e');
    }
    super.onClose();
  }
}
