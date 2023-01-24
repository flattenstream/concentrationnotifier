import { MODULE } from "./settings.mjs";

export class API {

  // determine if you are concentrating at all.
  static isActorConcentrating(caster) {
    const actor = caster.actor ?? caster;
    const effect = actor.effects.find(eff => {
      return API.isEffectConcentration(eff);
    });
    return !!effect ? effect : false;
  }

  // determine if you are concentrating on a specific item.
  static isActorConcentratingOnItem(caster, item) {
    const actor = caster.actor ?? caster;
    const effect = actor.effects.find(eff => {
      const itemUuid = eff.getFlag(MODULE, "data.castData.itemUuid");
      return itemUuid === item.uuid;
    });
    return !!effect ? effect : false;
  }

  // determine if effect is concentration effect.
  static isEffectConcentration(effect) {
    return effect.getFlag("core", "statusId") === "concentration";
  }

  // end all concentration effects on an actor.
  static async breakConcentration(caster) {
    const actor = caster.actor ?? caster;
    const deleteIds = actor.effects.filter(eff => {
      return API.isEffectConcentration(eff);
    }).map(i => i.id);
    return actor.deleteEmbeddedDocuments("ActiveEffect", deleteIds);
  }

  // wait for concentration on item to be applied on actor.
  static async waitForConcentrationStart(caster, { item, max_wait = 10000 } = {}) {
    const actor = caster.actor ?? caster;

    async function wait(ms) {
      return new Promise(resolve => {
        setTimeout(resolve, ms);
      });
    }
    function getConc() {
      if (!!item) return API.isActorConcentratingOnItem(actor, item);
      return API.isActorConcentrating(actor);
    }

    let conc = getConc();
    let waited = 0;
    while (!conc && waited < max_wait) {
      await wait(100);
      waited = waited + 100;
      conc = getConc();
    }
    if (!!conc) return conc;
    return false;
  }

  // display the card of the item being concentrated on, at the appropriate level.
  static async redisplayCard(caster) {
    const actor = caster.actor ?? caster;
    const isConc = CN.isActorConcentrating(actor);
    if (!isConc) {
      const locale = game.i18n.format("CN.WarningActorNotConcentrating", { name: actor.name });
      ui.notifications.warn(locale);
      return null;
    }

    const { itemData, castData } = isConc.getFlag(MODULE, "data");
    const item = fromUuidSync(castData.itemUuid);
    const clone = item?.clone(itemData, { keepId: true }) ?? new Item.implementation(itemData, { parent: actor });

    if (!clone) {
      ui.notifications.warn("CN.ItemNotFound", { localize: true });
      return null;
    }

    clone.prepareFinalAttributes();
    return clone.use({
      createMeasuredTemplate: false,
      consumeQuantity: false,
      consumeRecharge: false,
      consumeResource: false,
      consumeSpellLevel: false,
      consumeSpellSlot: false,
      consumeUsage: false
    }, { configureDialog: false });
  }
}
