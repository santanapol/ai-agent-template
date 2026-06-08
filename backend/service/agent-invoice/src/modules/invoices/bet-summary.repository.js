import { ObjectId } from 'mongodb';



import { getOrgDataDatabase } from '../../config/database-read.js';



const COLLECTION = 'member_bet_dau_summary';



/**

 * Branches with play activity in the billing period.

 * @param {Date} startDate

 * @param {Date} endDate

 */

export async function distinctBranchIdsWithPlay(startDate, endDate) {

  const db = getOrgDataDatabase();

  const rows = await db

    .collection(COLLECTION)

    .aggregate([

      {

        $match: {

          date: { $gte: startDate, $lte: endDate },

        },

      },

      { $group: { _id: '$branch_id' } },

    ])

    .toArray();

  return rows.map((row) => row._id);

}



export async function aggregateNetWin({ branchIds, startDate, endDate }) {

  const db = getOrgDataDatabase();

  return db

    .collection(COLLECTION)

    .aggregate([

      {

        $match: {

          branch_id: { $in: branchIds.map((id) => new ObjectId(id)) },

          date: { $gte: startDate, $lte: endDate },

        },

      },

      {

        $group: {

          _id: {

            ou_id: '$ou_id',

            branch_id: '$branch_id',

            company_id: '$company_id',

            main_category_id: '$main_category_id',

          },

          net_win: { $sum: '$net_win' },

        },

      },

      {

        $project: {

          _id: 0,

          ou_id: '$_id.ou_id',

          branch_id: '$_id.branch_id',

          company_id: '$_id.company_id',

          main_category_id: '$_id.main_category_id',

          net_win: 1,

          fee: { $literal: null },

          amount: { $literal: null },

        },

      },

    ])

    .toArray();

}

