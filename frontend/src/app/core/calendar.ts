import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ImportIcsResult, OccurrenceResponse, SetOccurrenceExceptionRequest } from './models';

export interface OccurrenceFilter {
  from: string;
  until: string;
  calendarId?: string;
}

@Service()
export class CalendarApi {
  private readonly http = inject(HttpClient);

  occurrences(filter: OccurrenceFilter) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value != null) params = params.set(key, value);
    }
    return this.http.get<OccurrenceResponse[]>(`${environment.apiUrl}/calendar/occurrences`, { params });
  }

  /** Skip just this one occurrence of a recurring Appointment. */
  skipOccurrence(appointmentId: string, date: string) {
    return this.http.delete<void>(`${environment.apiUrl}/calendar/appointments/${appointmentId}/occurrences/${date}`);
  }

  setOccurrenceException(appointmentId: string, date: string, request: SetOccurrenceExceptionRequest) {
    return this.http.put<void>(`${environment.apiUrl}/calendar/appointments/${appointmentId}/occurrences/${date}`, request);
  }

  importIcs(collectionId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportIcsResult>(`${environment.apiUrl}/calendar/collections/${collectionId}/import`, formData);
  }
}
