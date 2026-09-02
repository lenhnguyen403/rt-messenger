import { UserDocument } "../models/user.model"

declare global {
    namespace Express {
        interface User extends UserDocument {
            _id?: any;
        }
    }
}