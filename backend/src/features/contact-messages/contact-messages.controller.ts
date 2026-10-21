import { Body, Controller, Post } from '@nestjs/common';
import { ContactMessagesService } from './contact-messages.service';

@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly contacts: ContactMessagesService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.contacts.create(body);
  }
}
