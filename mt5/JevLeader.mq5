#property copyright "jev-trader"
#property link      "https://github.com"
#property version   "1.00"
#property description "Posts XAUUSD ticks to the Jev gold server and executes the latest buy/sell signal."

#include <Trade/Trade.mqh>
#include "JevHttp.mqh"

input string InpServer       = "http://127.0.0.1:3001";
input string InpSymbol       = "XAUUSD";
input double InpLot          = 0.01;
input int    InpSlippage     = 30;
input long   InpMagic        = 210921;
input int    InpSLPoints     = 80;
input int    InpTPPoints     = 120;
input int    InpMaxSpreadPips = 30;
input int    InpMaxAgeMs     = 5000;
input int    InpTimeoutMs    = 2000;
input int    InpPollMs       = 200;

CTrade trade;
string g_symbol;
string g_last_action = "";
int    g_last_seq = -1;

int OnInit()
{
   g_symbol = JevResolveSymbol(InpSymbol);
   if(!SymbolSelect(g_symbol, true))
     {
      Print("JevLeader: symbol not found ", InpSymbol);
      return INIT_FAILED;
     }
   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetTypeFillingBySymbol(g_symbol);
   if(!EventSetMillisecondTimer(InpPollMs))
     {
      Print("JevLeader: timer failed");
      return INIT_FAILED;
     }
   Print("JevLeader symbol=", g_symbol, " server=", InpServer, " sl=", InpSLPoints, " tp=", InpTPPoints);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTick()
{
}

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;
   if(!HistoryDealSelect(trans.deal))
      return;
   if(HistoryDealGetString(trans.deal, DEAL_SYMBOL) != g_symbol)
      return;
   if(HistoryDealGetInteger(trans.deal, DEAL_MAGIC) != InpMagic)
      return;
   long entry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY)
      return;
   long why = HistoryDealGetInteger(trans.deal, DEAL_REASON);
   string reason = "";
   if(why == DEAL_REASON_SL)
      reason = "sl";
   else if(why == DEAL_REASON_TP)
      reason = "tp";
   else
      return;
   long dealType = HistoryDealGetInteger(trans.deal, DEAL_TYPE);
   string side = dealType == DEAL_TYPE_SELL ? "buy" : "sell";
   double lots = HistoryDealGetDouble(trans.deal, DEAL_VOLUME);
   double price = HistoryDealGetDouble(trans.deal, DEAL_PRICE);
   ulong ticket = (ulong)HistoryDealGetInteger(trans.deal, DEAL_POSITION_ID);
   PostClose(ticket, side, lots, price, reason);
}

void OnTimer()
{
   PostTick();
   string raw = JevHttp("GET", JevJoin(InpServer, "/signal"), "", InpTimeoutMs);
   if(raw == "")
      return;
   string action = JevJsonString(raw, "action");
   string position = JevJsonString(raw, "position");
   int seq = (int)JevJsonNumber(raw, "seq", -1);
   double ts = JevJsonNumber(raw, "ts", 0);
   bool spreadOk = JevJsonBool(raw, "spreadOk", true);
   double lot = JevJsonNumber(raw, "lot", InpLot);
   if(lot <= 0)
      lot = InpLot;
   int slPts = JevExitPoints(InpSLPoints, (int)JevJsonNumber(raw, "slPoints", 0), JEV_DEFAULT_SL_POINTS);
   int tpPts = JevExitPoints(InpTPPoints, (int)JevJsonNumber(raw, "tpPoints", 0), JEV_DEFAULT_TP_POINTS);

   long now_ms = (long)TimeGMT() * 1000;
   if(ts > 0 && MathAbs((double)now_ms - ts) > InpMaxAgeMs)
     {
      Print("JevLeader: stale signal age_ms=", MathAbs((double)now_ms - ts));
      return;
     }
   if(!spreadOk)
      return;
   if(JevSpreadPips(g_symbol, SymbolInfoDouble(g_symbol, SYMBOL_POINT)) > InpMaxSpreadPips)
      return;
   if(action != "buy" && action != "sell" && action != "hold")
      return;
   if(seq == g_last_seq && action == g_last_action)
      return;

   if(!ApplyPosition(position, action, lot, slPts, tpPts))
      return;
   g_last_seq = seq;
   g_last_action = action;
}

void PostTick()
{
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);
   long volume = SymbolInfoInteger(g_symbol, SYMBOL_VOLUME);
   string body = "{\"bid\":" + DoubleToString(bid, 5) +
                 ",\"ask\":" + DoubleToString(ask, 5) +
                 ",\"volume\":" + IntegerToString((int)volume) +
                 ",\"ts\":" + IntegerToString((long)TimeGMT() * 1000) + "}";
   JevHttp("POST", JevJoin(InpServer, "/tick"), body, InpTimeoutMs);
}

void PostFill(const ulong ticket, const string side, const double lots, const double price)
{
   string body = "{\"ticket\":" + IntegerToString((long)ticket) +
                 ",\"side\":\"" + side +
                 "\",\"lots\":" + DoubleToString(lots, 2) +
                 ",\"price\":" + DoubleToString(price, 5) +
                 ",\"symbol\":\"" + g_symbol + "\"}";
   JevHttp("POST", JevJoin(InpServer, "/fill"), body, InpTimeoutMs);
}

void PostClose(const ulong ticket, const string side, const double lots, const double price, const string reason)
{
   string body = "{\"ticket\":" + IntegerToString((long)ticket) +
                 ",\"side\":\"" + side +
                 "\",\"lots\":" + DoubleToString(lots, 2) +
                 ",\"price\":" + DoubleToString(price, 5) +
                 ",\"symbol\":\"" + g_symbol +
                 "\",\"kind\":\"close\",\"reason\":\"" + reason + "\"}";
   JevHttp("POST", JevJoin(InpServer, "/fill"), body, InpTimeoutMs);
}

bool ApplyPosition(const string want, const string action, double lot, const int slPts, const int tpPts)
{
   int have = JevOurSide(g_symbol, InpMagic);
   string target = want;
   if(target != "buy" && target != "sell" && target != "flat")
     {
      if(action == "buy")
         target = "buy";
      else if(action == "sell")
         target = "sell";
      else
         return true;
     }

   int need = 0;
   if(target == "buy")
      need = 1;
   else if(target == "sell")
      need = -1;

   if(have == need)
      return true;

   if(have != 0 && need != 0 && have != need)
      return true;

   if(have != 0)
     {
      if(!JevCloseOurs(trade, g_symbol, InpMagic))
         return false;
      have = 0;
     }
   if(need == 0)
      return true;

   lot = JevNormLot(g_symbol, lot, InpLot, 0);
   if(lot <= 0)
     {
      Print("JevLeader: lot rounded to 0");
      return false;
     }
   return OpenSide(need, lot, slPts, tpPts);
}

bool OpenSide(const int need, const double lot, const int slPts, const int tpPts)
{
   double sl = 0;
   double tp = 0;
   if(!JevStops(g_symbol, need, slPts, tpPts, sl, tp))
     {
      Print("JevLeader: refused order, SL/TP would be zero");
      return false;
     }
   bool ok = false;
   if(need > 0)
     {
      ok = trade.Buy(lot, g_symbol, 0, sl, tp, "jev-gold");
      if(ok)
         PostFill(trade.ResultOrder(), "buy", lot, trade.ResultPrice());
     }
   else
     {
      ok = trade.Sell(lot, g_symbol, 0, sl, tp, "jev-gold");
      if(ok)
         PostFill(trade.ResultOrder(), "sell", lot, trade.ResultPrice());
     }
   if(!ok)
      Print("JevLeader: send failed ", trade.ResultRetcodeDescription());
   return ok;
}
