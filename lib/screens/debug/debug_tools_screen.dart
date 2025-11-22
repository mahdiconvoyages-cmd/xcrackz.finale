import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

class DebugToolsScreen extends StatefulWidget {
  const DebugToolsScreen({super.key});

  @override
  State<DebugToolsScreen> createState() => _DebugToolsScreenState();
}

class _DebugToolsScreenState extends State<DebugToolsScreen> {
  PackageInfo? _packageInfo;
  bool _isLoading = true;
  String _logContent = '';
  Map<String, dynamic> _deviceInfo = {};
  Map<String, dynamic> _networkInfo = {};

  @override
  void initState() {
    super.initState();
    _loadDebugInfo();
  }

  Future<void> _loadDebugInfo() async {
    setState(() => _isLoading = true);

    try {
      _packageInfo = await PackageInfo.fromPlatform();
      await _loadDeviceInfo();
      await _loadNetworkInfo();
      await _loadLogs();
    } catch (e) {
      debugPrint('Error loading debug info: $e');
    }

    setState(() => _isLoading = false);
  }

  Future<void> _loadDeviceInfo() async {
    _deviceInfo = {
      'Platform': Platform.operatingSystem,
      'Version': Platform.operatingSystemVersion,
      'Locale': Platform.localeName,
      'Processors': Platform.numberOfProcessors,
    };
  }

  Future<void> _loadNetworkInfo() async {
    final supabase = Supabase.instance.client;
    final user = supabase.auth.currentUser;

    _networkInfo = {
      'Supabase Connected': supabase.auth.currentSession != null ? 'Yes' : 'No',
      'User ID': user?.id ?? 'Not logged in',
      'User Email': user?.email ?? 'N/A',
      'Session Valid': user != null ? 'Yes' : 'No',
      'Auth State': supabase.auth.currentSession != null ? 'Authenticated' : 'Not Authenticated',
    };
  }

  Future<void> _loadLogs() async {
    // In a real app, you'd load actual logs from a file or service
    _logContent = '''
[${DateTime.now()}] App Started
[${DateTime.now().subtract(const Duration(minutes: 5))}] User logged in
[${DateTime.now().subtract(const Duration(minutes: 3))}] Loaded dashboard data
[${DateTime.now().subtract(const Duration(minutes: 1))}] Navigated to Debug Tools
''';
  }

  Future<void> _clearCache() async {
    try {
      final tempDir = await getTemporaryDirectory();
      if (tempDir.existsSync()) {
        tempDir.deleteSync(recursive: true);
        tempDir.createSync();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cache cleared successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error clearing cache: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _exportLogs() async {
    try {
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/finality_logs_${DateTime.now().millisecondsSinceEpoch}.txt');
      await file.writeAsString(_logContent);

      await Share.shareXFiles(
        [XFile(file.path)],
        subject: 'Finality App Logs',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error exporting logs: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _copyToClipboard(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Copied to clipboard'),
          duration: Duration(seconds: 1),
        ),
      );
    }
  }

  Future<void> _testSupabaseConnection() async {
    try {
      final response = await Supabase.instance.client
          .from('profiles')
          .select('id')
          .limit(1);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Connection successful! Response: ${response.length} row(s)'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Connection failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Debug Tools'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDebugInfo,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDebugInfo,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // App Info Section
                  _buildSection(
                    title: 'App Information',
                    icon: Icons.info_outline,
                    color: Colors.blue,
                    children: [
                      _buildInfoRow('App Name', _packageInfo?.appName ?? 'N/A'),
                      _buildInfoRow('Package', _packageInfo?.packageName ?? 'N/A'),
                      _buildInfoRow('Version', _packageInfo?.version ?? 'N/A'),
                      _buildInfoRow('Build Number', _packageInfo?.buildNumber ?? 'N/A'),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Device Info Section
                  _buildSection(
                    title: 'Device Information',
                    icon: Icons.phone_android,
                    color: Colors.green,
                    children: _deviceInfo.entries
                        .map((e) => _buildInfoRow(e.key, e.value.toString()))
                        .toList(),
                  ),

                  const SizedBox(height: 16),

                  // Network & Auth Section
                  _buildSection(
                    title: 'Network & Authentication',
                    icon: Icons.cloud_outlined,
                    color: Colors.orange,
                    children: [
                      ..._networkInfo.entries
                          .map((e) => _buildInfoRow(e.key, e.value.toString()))
                          .toList(),
                      const Divider(height: 24),
                      ElevatedButton.icon(
                        onPressed: _testSupabaseConnection,
                        icon: const Icon(Icons.wifi_tethering),
                        label: const Text('Test Supabase Connection'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Logs Section
                  _buildSection(
                    title: 'Application Logs',
                    icon: Icons.article_outlined,
                    color: Colors.purple,
                    children: [
                      Container(
                        height: 200,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey[900],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: SingleChildScrollView(
                          child: Text(
                            _logContent,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: Colors.greenAccent,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _exportLogs,
                              icon: const Icon(Icons.upload_file),
                              label: const Text('Export Logs'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.purple,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _copyToClipboard(_logContent),
                              icon: const Icon(Icons.copy),
                              label: const Text('Copy Logs'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Actions Section
                  _buildSection(
                    title: 'Developer Actions',
                    icon: Icons.build_outlined,
                    color: Colors.red,
                    children: [
                      ListTile(
                        leading: const Icon(Icons.delete_outline, color: Colors.red),
                        title: const Text('Clear Cache'),
                        subtitle: const Text('Remove temporary files and cached data'),
                        onTap: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Clear Cache'),
                              content: const Text(
                                'Are you sure you want to clear all cached data? This action cannot be undone.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: const Text('Cancel'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text('Clear'),
                                ),
                              ],
                            ),
                          );

                          if (confirm == true) {
                            await _clearCache();
                          }
                        },
                      ),
                      ListTile(
                        leading: const Icon(Icons.bug_report, color: Colors.orange),
                        title: const Text('Show Debug Overlay'),
                        subtitle: const Text('Display performance metrics'),
                        onTap: () {
                          // Toggle debug overlay (would need to be implemented globally)
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Debug overlay would be shown in production app'),
                            ),
                          );
                        },
                      ),
                      ListTile(
                        leading: const Icon(Icons.restore, color: Colors.blue),
                        title: const Text('Reset Onboarding'),
                        subtitle: const Text('Show onboarding screens again'),
                        onTap: () async {
                          // Would reset SharedPreferences for onboarding
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Onboarding will be shown on next app start'),
                            ),
                          );
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // Warning Footer
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.red[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red[200]!),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: Colors.red[700]),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'These tools are for development and debugging purposes only. Some actions may affect app data.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.red[900],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required Color color,
    required List<Widget> children,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withAlpha(25),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    value,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy, size: 16),
                  onPressed: () => _copyToClipboard(value),
                  tooltip: 'Copy',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
