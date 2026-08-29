// import { ClientStatus } from '../models';
// import { VisitHistory } from '../models/models';
import { LOYALTY_LEVELS, LoyaltyLevel } from '../shared/types';

export interface IVisit {
    id: number;
    clientId: number;
    isComplaint: boolean;
    total: number;
    createdAt: Date;
    updatedAt: Date;
}

// export const recalculateLoyalty = async (clientId: number) => {
//     const visits = await VisitHistory.findAll({ where: { clientId } }) as unknown as IVisit[];

//     const totalVisits = visits.length;
//     const complaints = visits.filter(v => v.isComplaint).length;

//     let newLevel: LoyaltyLevel = LOYALTY_LEVELS.AVERAGE;

//     if (totalVisits > 10 && complaints === 0) {
//         newLevel = LOYALTY_LEVELS.VIP;
//     } else if (complaints > 2) {
//         newLevel = LOYALTY_LEVELS.TROUBLEMAKER;
//     }

//     await ClientStatus.upsert({
//         clientId,
//         loyaltyLevel: newLevel,
//     });
// };
