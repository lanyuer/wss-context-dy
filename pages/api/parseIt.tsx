import { Playwright, Browser, Page, chromium, BrowserContext, LaunchOptions, Cookie } from 'playwright';
import * as fs from 'fs';
import * as util from 'util';
import * as crypto from 'crypto';
import * as secrets from 'secrets';
import { promisify } from 'util';
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "url";


const readFile = util.promisify(fs.readFile);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface LivingRoomContext {
  url: string;
  room_id: string;
  title: string;
  cookie_ttwid: string;
  flvs: string;
  flv: string;
  wss_url: string;
  user_id: string;
  user_unique_id: string;
  user_count: string;
  total_user: string;
  has_commerce_goods: boolean;
  owner_id: string;
  admin_user: string;
  owner_sec_uid: string;
  owner_nickname: string;
  tm: number;
  tm_create: string;
}

const MAX_RESTART_PAGES = 10;
const live_id = 1;
const aid = 6383;
const version_code = '180800';
const webcast_sdk_version = '1.3.0';
const sub_room_id = '';
const sub_channel_id = '';
const did_rule = 3;
const device_platform = 'web';
const device_type = '';
const ac = '';
const identity = 'audience';
const wss_push_did = '7200658128986916404';

class DyPagePl {
  private pm: any;
  private browser: any;
  private context: any;
  private user_agent: string;

  constructor() {
    this.browser = null;
    this.user_agent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
  }

  async openBrowser() {

    this.browser = await chromium.launch({ headless: true, timeout: 40000 });
    this.context = await this.browser.newContext({ userAgent: this.user_agent });
    //const cookies = JSON.parse(await readFile('cookies.json', 'utf-8'));
    //await this.context.addCookies(cookies);
  }

  async startBrowser() {
    //this.pm = await Playwright.async_playwright().start();
    await this.openBrowser();
    //return this.pm;

  }

  async closeBrowser() {
    await this.context.close();
    await this.browser.close();
  }

  async getWebsocketUrl(url: string): Promise<LivingRoomContext | null> {
    const page = await this.context.newPage();

    await page.setDefaultTimeout(60000);
    await page.goto(url);

    const content = await page.content();
    const dataString = content.match(/<script id="RENDER_DATA" type="application\/json">(.*?)<\/script>/s);
    if (!dataString || dataString.length === 0) {
      await page.close();
      throw new Error(`直播链接未发现RENDER_DATA：roominfo=${url}, content=${content}`);
    }

    const dataDict = JSON.parse(decodeURIComponent(dataString[1]));

    const room = dataDict.app.initialState.roomStore.roomInfo.room;
    if (!room) {
      await page.close();
      throw new Error(`直播链接未发现room：roominfo=${url}, content=${content}`);
    }

    const room_id = room.id_str;
    const status = room.status; // 4直播已结束，2直播中
    if (status === 4) {
      await page.close();
      throw new Error(`直播已结束: status=${status}, roominfo=${room}`);
    } else if (status !== 2) {
      await page.close();
      throw new Error(`未知直播状态：status=${status}, roominfo=${room}`);
    }

    const user_id = dataDict.app.odin.user_id;
    const user_unique_id = dataDict.app.odin.user_unique_id;
    const title = room.title;
    const user_count = room.stats?.user_count_str || '';
    const total_user = room.stats?.total_user_str || '';
    const has_commerce_goods = room.has_commerce_goods;
    const owner_id = room.owner.id_str;
    const admin_user = room.admin_user_ids_str.join(',');
    const owner_sec_uid = room.owner.sec_uid;
    const owner_nickname = room.owner.nickname;

    const params = {
      live_id: 1,
      aid: 6383,
      version_code: '180800',
      webcast_sdk_version: '1.3.0',
      room_id: room_id,
      sub_room_id: '',
      sub_channel_id: '',
      did_rule: 3,
      user_unique_id: user_unique_id,
      device_platform: 'web',
      device_type: '',
      ac: '',
      identity: 'audience',
    };

    const xmstub = crypto
      .createHash('md5')
      .update(Object.entries(params).map(([k, v]) => `${k}=${v}`).join(','))
      .digest('hex');

    const signature = await page.evaluate(async (xmstub) => {
      const s = { 'X-MS-STUB': `'${xmstub}'` };
      return window.byted_acrawler.frontierSign(s);
    }, xmstub);

    let cookie = '';
    const cookies = await this.context.cookies();
    for (const c of cookies) {
      if (c.name === 'ttwid') {
        cookie = c.value;
        break;
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const ntime = process.hrtime.bigint();

    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}${(currentDate.getMonth() + 1).toString().padStart(2, '0')}${currentDate.getDate().toString().padStart(2, '0')}${currentDate.getHours().toString().padStart(2, '0')}${currentDate.getMinutes().toString().padStart(2, '0')}${currentDate.getSeconds().toString().padStart(2, '0')}`;

    const hexString = crypto.randomBytes(4).toString('hex');
    const dim_log_id = `${formattedDate}${hexString.toUpperCase()}`;

    const queryParams = {
      app_name: 'douyin_web',
      version_code: '180800',
      webcast_sdk_version: '1.3.0',
      update_version_code: '1.3.0',
      compress: 'gzip',
      internal_ext: `internal_src:dim|wss_push_room_id:${room_id}|wss_push_did:7200658128986916404|dim_log_id:${dim_log_id}|fetch_time:${now}|seq:1|wss_info:0-${now}-0-0|wrds_kvs:AudienceGiftSyncData-${ntime}_InputPanelComponentSyncData-${ntime}_WebcastRoomRankMessage-${ntime}_HighlightContainerSyncData-16_WebcastRoomStatsMessage-${ntime}`,
      host: 'https://live.douyin.com',
      aid: 6383,
      live_id: 1,
      did_rule: 3,
      debug: 'false',
      maxCacheMessageNumber: 20,
      endpoint: 'live_pc',
      support_wrds: 1,
      im_path: '/webcast/im/fetch/',
      user_unique_id: user_unique_id,
      device_platform: 'web',
      cookie_enabled: 'true',
      screen_width: '2048',
      screen_height: '1152',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Mozilla',
      browser_version: '5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/111.0.0.0%20Safari/537.36',
      browser_online: 'true',
      tz_name: 'Asia/Shanghai',
      identity: 'audience',
      room_id: room_id,
      heartbeatDuration: 0,
      signature: signature['X-Bogus'],
    };

    const encodedParams = Object.entries(queryParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const wss_url = `wss://webcast3-ws-web-hl.douyin.com/webcast/im/push/v2/?${encodedParams}`;

    let flv = '';

    for (const key in room.stream_url.flv_pull_url) {
      if (key in room.stream_url.flv_pull_url) {
        flv = room.stream_url.flv_pull_url[key];
        break;
      }
    }

    const ctx: LivingRoomContext = {
      url: url,
      room_id: room_id,
      title: title,
      cookie_ttwid: cookie,
      flvs: JSON.stringify(room.stream_url.flv_pull_url),
      flv: flv,
      wss_url: wss_url,
      user_id: user_id,
      user_unique_id: user_unique_id,
      user_count: room.stats ? room.stats.user_count_str : '',
      total_user: room.stats ? room.stats.total_user_str : '',
      has_commerce_goods: room.has_commerce_goods,
      owner_id: room.owner.id_str,
      admin_user: room.admin_user_ids_str.join(','),
      owner_sec_uid: room.owner.sec_uid,
      owner_nickname: room.owner.nickname,
      tm: Math.floor(Date.now() / 1000),
      tm_create: formattedDate,
    };

    await page.close();

    return ctx;

  }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // 调用 DyPagePl的getWebsocketUrl，将req中的url参数作为参数，返回结果用json包装 

  const { query } = parse(req.url || "", true);

  const regex = /^https:\/\/live\.douyin\.com\/\d+$/;
  if (!regex.test(query.url as string)) {
    res.status(400).json({ err_no: -1, err_msg: 'url参数格式错误' });
    return;
  }

  const dyPagePl = new DyPagePl();
  await dyPagePl.startBrowser()
  try {
    const livingRoomContext = await dyPagePl.getWebsocketUrl(query.url as string);
    res.status(200).json({ data: livingRoomContext, err_no: 0 });
  }
  catch (e) {
    res.status(500).json({ err_no: -1, err_msg: e.message });
  }

  await dyPagePl.closeBrowser();

};