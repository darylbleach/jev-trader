#ifndef JEV_HTTP_MQH
#define JEV_HTTP_MQH

#include <Trade/Trade.mqh>

#define JEV_DEFAULT_SL_POINTS 250
#define JEV_DEFAULT_TP_POINTS 150

string JevTrim(string s)
{
   StringTrimLeft(s);
   StringTrimRight(s);
   return s;
}

string JevJsonRaw(const string json, const string key)
{
   string pat = "\"" + key + "\"";
   int i = StringFind(json, pat);
   if(i < 0)
      return "";
   int colon = StringFind(json, ":", i + StringLen(pat));
   if(colon < 0)
      return "";
   int n = StringLen(json);
   int a = colon + 1;
   while(a < n)
     {
      ushort c = StringGetCharacter(json, a);
      if(c != ' ' && c != '\n' && c != '\r' && c != '\t')
         break;
      a++;
     }
   if(a >= n)
      return "";
   ushort first = StringGetCharacter(json, a);
   if(first == '"')
     {
      int b = StringFind(json, "\"", a + 1);
      if(b < 0)
         return "";
      return StringSubstr(json, a + 1, b - a - 1);
     }
   int b = a;
   while(b < n)
     {
      ushort c = StringGetCharacter(json, b);
      if(c == ',' || c == '}' || c == ']' || c == ' ' || c == '\n' || c == '\r')
         break;
      b++;
     }
   return StringSubstr(json, a, b - a);
}

string JevJsonString(const string json, const string key)
{
   return JevJsonRaw(json, key);
}

double JevJsonNumber(const string json, const string key, const double fallback = 0)
{
   string raw = JevJsonRaw(json, key);
   if(raw == "" || raw == "null")
      return fallback;
   return StringToDouble(raw);
}

bool JevJsonBool(const string json, const string key, const bool fallback = false)
{
   string raw = JevTrim(JevJsonRaw(json, key));
   if(raw == "true")
      return true;
   if(raw == "false")
      return false;
   return fallback;
}

string JevHttp(const string method, const string url, const string body, const int timeout)
{
   char data[];
   char result[];
   string headers = "Content-Type: application/json\r\n";
   string result_headers;
   if(StringLen(body) > 0)
     {
      int n = StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
      if(n > 0)
         ArrayResize(data, n - 1);
     }
   ResetLastError();
   int code = WebRequest(method, url, headers, timeout, data, result, result_headers);
   if(code == -1)
     {
      Print("Jev WebRequest failed err=", GetLastError(), " url=", url,
            " Add the gold server origin under Tools, Options, Expert Advisors, Allow WebRequest.");
      return "";
     }
   if(code < 200 || code >= 300)
     {
      Print("Jev HTTP ", code, " ", url);
      return "";
     }
   return CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
}

string JevJoin(const string origin, const string path)
{
   string base = origin;
   int n = StringLen(base);
   if(n > 0 && StringGetCharacter(base, n - 1) == '/')
      base = StringSubstr(base, 0, n - 1);
   return base + path;
}

string JevResolveSymbol(const string inp)
{
   string want = inp;
   if(want == "")
      want = _Symbol;
   if(SymbolSelect(want, true))
      return want;
   string alts[] = {"XAUUSD", "GOLD", "XAUUSDm", "XAUUSD.a", "XAUUSD.c", "XAUUSD.pro"};
   for(int i = 0; i < ArraySize(alts); i++)
     {
      if(SymbolSelect(alts[i], true))
         return alts[i];
     }
   return want;
}

int JevOurSide(const string symbol, const long magic)
{
   int buys = 0;
   int sells = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(PositionGetString(POSITION_SYMBOL) != symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != magic)
         continue;
      ENUM_POSITION_TYPE typ = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      if(typ == POSITION_TYPE_BUY)
         buys++;
      else if(typ == POSITION_TYPE_SELL)
         sells++;
     }
   if(buys > 0 && sells == 0)
      return 1;
   if(sells > 0 && buys == 0)
      return -1;
   return 0;
}

bool JevCloseOurs(CTrade &trade, const string symbol, const long magic)
{
   bool ok = true;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(PositionGetString(POSITION_SYMBOL) != symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != magic)
         continue;
      if(!trade.PositionClose(ticket))
        {
         Print("Jev close failed ticket=", ticket, " ", trade.ResultRetcodeDescription());
         ok = false;
        }
     }
   return ok;
}

double JevSpreadPips(const string symbol, const double point)
{
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   if(point <= 0)
      return 1.0e12;
   return (ask - bid) / point;
}

int JevExitPoints(const int inp, const int fromSignal, const int fallback)
{
   int pts = inp;
   if(pts <= 0)
      pts = fromSignal;
   if(pts <= 0)
      pts = fallback;
   if(pts < 1)
      pts = 1;
   return pts;
}

int JevClampStops(const string symbol, const int points)
{
   int stops = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
   if(stops < 0)
      stops = 0;
   int pts = points;
   if(pts < stops)
      pts = stops;
   if(pts < 1)
      pts = 1;
   return pts;
}

bool JevStops(const string symbol, const int need, const int slPoints, const int tpPoints, double &sl, double &tp)
{
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   int slPts = JevClampStops(symbol, slPoints);
   int tpPts = JevClampStops(symbol, tpPoints);
   sl = 0;
   tp = 0;
   if(point <= 0 || bid <= 0 || ask <= 0)
      return false;
   if(need > 0)
     {
      sl = NormalizeDouble(ask - slPts * point, digits);
      tp = NormalizeDouble(ask + tpPts * point, digits);
     }
   else
     {
      sl = NormalizeDouble(bid + slPts * point, digits);
      tp = NormalizeDouble(bid - tpPts * point, digits);
     }
   return (sl > 0 && tp > 0);
}

double JevNormLot(const string symbol, double lots, const double minLot, const double maxLot)
{
   double step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   double vmin = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double vmax = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   if(step <= 0)
      step = 0.01;
   if(minLot > vmin)
      vmin = minLot;
   if(maxLot > 0 && maxLot < vmax)
      vmax = maxLot;
   lots = MathFloor(lots / step + 1.0e-12) * step;
   if(lots < vmin)
      return 0;
   if(lots > vmax)
      lots = vmax;
   int digits = 2;
   if(step < 0.01)
      digits = 3;
   return NormalizeDouble(lots, digits);
}

#endif
