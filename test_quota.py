"""Offline contract/security tests. No real credentials or network calls."""
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch

fastapi = types.ModuleType('fastapi')
class Router:
    def get(self, path):
        return lambda function: function
fastapi.APIRouter = Router
sys.modules['fastapi'] = fastapi
agent = types.ModuleType('agent')
secret = types.ModuleType('agent.secret_scope')
secret.get_secret = lambda name: 'tp-TEST_ONLY_NOT_REAL'
sys.modules['agent'] = agent
sys.modules['agent.secret_scope'] = secret
spec = importlib.util.spec_from_file_location('quota', Path(__file__).parent / 'dashboard/plugin_api.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SAMPLE = {'object':'token_plan','plan_code':'lite','period':{'start_at':'2026-10-01 00:00:00','end_at':'2026-10-31 23:59:59'},'quota':{'total_credits':1000000,'used_credits':100000,'remaining_credits':900000},'auto_renew':True}

class QuotaTests(unittest.TestCase):
    def setUp(self):
        module._cache = None
        module._attempt = None
        module._error = None

    def test_real_sample_units_and_utc(self):
        result = module.normalize(SAMPLE)
        self.assertAlmostEqual(result['percent'], 10.0)
        self.assertEqual(result['unit'], 'credits')
        self.assertEqual(result['end_at'], '2026-10-31T23:59:59+00:00')

    def test_inconsistent_quota_rejected(self):
        malformed = json.loads(json.dumps(SAMPLE))
        malformed['quota']['remaining_credits'] = 0
        with self.assertRaises(ValueError):
            module.normalize(malformed)

    def test_one_request_per_minute_and_no_shared_mutation(self):
        with patch.object(module, 'fetch_quota', return_value=module.normalize(SAMPLE)) as fetch:
            first = module.quota()
            first['data']['used'] = -1
            second = module.quota()
            self.assertEqual(second['data']['used'], 100000)
            self.assertEqual(fetch.call_count, 1)

    def test_error_does_not_leak_key_or_erase_last_good_read(self):
        module._cache = module.normalize(SAMPLE)
        with patch.object(module, 'fetch_quota', side_effect=RuntimeError('tp-PRIVATE_SECRET')):
            result = module.quota()
        self.assertTrue(result['stale'])
        self.assertTrue(result['ok'])
        self.assertNotIn('PRIVATE_SECRET', json.dumps(result))
        self.assertEqual(result['data']['used'], 100000)

    def test_redirect_is_not_followed_and_body_never_exposed(self):
        response = types.SimpleNamespace(status=302)
        connection = unittest.mock.Mock()
        connection.getresponse.return_value = response
        with patch.object(module.http.client, 'HTTPSConnection', return_value=connection) as constructor:
            result = module.quota()
        constructor.assert_called_once_with('token-plan-ams.xiaomimimo.com', timeout=15)
        self.assertIn('HTTP 302', result['error'])
        self.assertEqual(connection.request.call_count, 1)
        response_body_reads = getattr(response, 'read', None)
        self.assertIsNone(response_body_reads)

if __name__ == '__main__':
    unittest.main()
